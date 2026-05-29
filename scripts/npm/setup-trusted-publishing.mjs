#!/usr/bin/env node

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import fs from 'fs-extra';
import minimist from 'minimist';
import os from 'node:os';
import path from 'node:path';

import {exec, spawn} from '../shared/childProcess.mjs';
import {packagesManager} from '../shared/packagesManager.mjs';

const argv = minimist(process.argv.slice(2));
const bootstrap = !!argv.bootstrap;
const setupTrust = !!argv['setup-trust'];
const dryRun = !!argv['dry-run'];
const registry = (argv.registry || 'https://registry.npmjs.org').replace(
  /\/+$/,
  '',
);
const stubVersion = argv['stub-version'] || '0.0.0-bootstrap.0';
const workflow = argv.workflow || 'call-release.yml';
const repo = argv.repo || 'facebook/lexical';

const [repoOwner, repoName] = repo.split('/');
if (!repoOwner || !repoName) {
  console.error(`Invalid --repo value '${repo}'. Expected owner/name.`);
  process.exit(1);
}

/**
 * @param {string} name
 * @returns {Promise<boolean>}
 */
async function packageExistsOnRegistry(name) {
  const res = await fetch(`${registry}/${name}`, {method: 'HEAD'});
  if (res.status === 404) {
    return false;
  }
  if (res.ok) {
    return true;
  }
  throw new Error(`Unexpected status ${res.status} from ${registry}/${name}`);
}

/**
 * @param {string} dir
 * @param {import('../shared/PackageMetadata.mjs').PackageMetadata} pkg
 */
async function writeStubFiles(dir, pkg) {
  await fs.writeJson(
    path.join(dir, 'package.json'),
    {
      description:
        'Placeholder published to claim the npm name during trusted publishing setup. Do not install.',
      homepage: 'https://lexical.dev',
      license: 'MIT',
      name: pkg.getNpmName(),
      repository: {
        type: 'git',
        url: `git+https://github.com/${repo}.git`,
      },
      version: stubVersion,
    },
    {spaces: 2},
  );
  await fs.writeFile(
    path.join(dir, 'README.md'),
    `# ${pkg.getNpmName()}\n\n` +
      `This ${stubVersion} placeholder was published only to claim the npm ` +
      `package name so trusted publishing can be configured on npmjs.com. ` +
      `It contains no code; a future release will replace it.\n`,
  );
  const license = pkg.resolve('LICENSE');
  if (await fs.pathExists(license)) {
    await fs.copy(license, path.join(dir, 'LICENSE'));
  }
}

/**
 * @param {import('../shared/PackageMetadata.mjs').PackageMetadata} pkg
 */
async function publishStub(pkg) {
  const name = pkg.getNpmName();
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lexical-stub-'));
  try {
    await writeStubFiles(tmpDir, pkg);
    if (dryRun) {
      console.log(`[dry-run] Would publish ${name}@${stubVersion}`);
      return;
    }
    await exec(
      `cd ${tmpDir} && npm publish --registry ${registry} --access public --tag bootstrap`,
    );
    console.log(`Published ${name}@${stubVersion}`);
    // Mark the stub as deprecated so anyone who accidentally installs it
    // sees a warning. Failure here is non-fatal — the stub is already
    // published, which is what unblocks trusted publishing setup.
    await exec(
      `npm deprecate --registry ${registry} ${name}@${stubVersion} "Bootstrap placeholder for trusted publishing setup; do not install"`,
    ).catch(err => {
      console.warn(
        `(Could not deprecate ${name}@${stubVersion}: ${
          err instanceof Error ? err.message : String(err)
        })`,
      );
    });
  } finally {
    await fs.remove(tmpDir);
  }
}

/**
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Encode a package name the same way npm-package-arg's
 * `spec.escapedName` does for registry URLs: scoped names have their
 * `/` escaped to `%2F`, the leading `@` is preserved, unscoped names
 * are passed through.
 *
 * @param {string} name
 * @returns {string}
 */
function escapedName(name) {
  return name.startsWith('@') ? name.replace('/', '%2F') : name;
}

/**
 * Read the npm auth token for the configured registry, preferring the
 * NPM_TOKEN env var and falling back to whatever the user's npmrc
 * resolves `_authToken` to. Used for read-only registry calls that
 * don't go through the npm CLI (so they don't trigger OTP prompts).
 *
 * @returns {Promise<string | null>}
 */
async function fetchAuthToken() {
  if (process.env.NPM_TOKEN) {
    const tok = process.env.NPM_TOKEN.trim();
    if (tok) {
      return tok;
    }
  }
  const host = new URL(registry).host;
  try {
    const {stdout} = await exec(`npm config get //${host}/:_authToken`);
    const token = stdout.trim();
    return token && token !== 'undefined' ? token : null;
  } catch {
    return null;
  }
}

/**
 * Fetch the current list of trusted publisher configurations for a
 * package via the registry HTTP API. Returns null when the request
 * can't be made or evaluated (no auth, network error, unexpected
 * status). Returns [] when the registry says the package has no
 * trust configurations.
 *
 * @param {string} name
 * @param {string | null} token
 * @returns {Promise<Array<any> | null>}
 */
async function fetchTrustConfigs(name, token) {
  if (!token) {
    return null;
  }
  try {
    const res = await fetch(
      `${registry}/-/package/${escapedName(name)}/trust`,
      {headers: {Authorization: `Bearer ${token}`}},
    );
    if (res.status === 404) {
      return [];
    }
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    if (Array.isArray(data)) {
      return data;
    }
    return data ? [data] : [];
  } catch {
    return null;
  }
}

/**
 * Check whether a stored trust configuration entry matches the
 * (repository, workflow, no-environment, publish) tuple we're about
 * to register.
 *
 * @param {any} config
 * @returns {boolean}
 */
function configMatches(config) {
  if (!config || config.type !== 'github') {
    return false;
  }
  const claims = config.claims || {};
  if (claims.repository !== repo) {
    return false;
  }
  const wf = claims.workflow_ref || {};
  if (wf.file !== workflow) {
    return false;
  }
  if (claims.environment) {
    return false;
  }
  return (
    Array.isArray(config.permissions) &&
    config.permissions.includes('createPackage')
  );
}

/**
 * Run `npm trust github` for one package. Invokes the npm CLI with
 * `stdio: 'inherit'` so the OTP / web-auth URL prints to the user's
 * terminal in real time (buffering via `exec` previously caused the
 * one-time URL to only surface after it had already expired).
 *
 * @param {import('../shared/PackageMetadata.mjs').PackageMetadata} pkg
 * @returns {Promise<'configured' | 'dry-run' | 'failed'>}
 */
async function addTrustConfig(pkg) {
  const name = pkg.getNpmName();
  const args = [
    'trust',
    'github',
    name,
    '--file',
    workflow,
    '--repo',
    repo,
    '--registry',
    registry,
    '--allow-publish',
    '-y',
  ];
  if (dryRun) {
    console.log(`  ${name} ... [dry-run] npm ${args.join(' ')}`);
    return 'dry-run';
  }
  console.log(`\nConfiguring ${name} (npm will prompt for OTP / web auth):`);
  try {
    await spawn('npm', args, {stdio: 'inherit'});
    console.log(`  ${name} ... configured\n`);
    return 'configured';
  } catch {
    console.error(`  ${name} ... FAILED\n`);
    return 'failed';
  }
}

async function checkAuth() {
  try {
    const {stdout} = await exec(`npm whoami --registry ${registry}`);
    return stdout.trim();
  } catch {
    return null;
  }
}

/**
 * @param {Array<import('../shared/PackageMetadata.mjs').PackageMetadata>} pkgs
 */
function printManualSetup(pkgs) {
  if (pkgs.length === 0) {
    return;
  }
  console.log('\n--- Trusted publishing setup ---');
  console.log(
    `Re-run with --setup-trust to configure these via \`npm trust github\`,`,
  );
  console.log('or set them up manually on npmjs.com with:');
  console.log('  Publisher:         GitHub Actions');
  console.log(`  Repository owner:  ${repoOwner}`);
  console.log(`  Repository name:   ${repoName}`);
  console.log(`  Workflow filename: ${workflow}`);
  console.log('  Environment:       (leave empty)');
  console.log('  Permissions:       Allow publish');
  console.log('');
  for (const pkg of pkgs) {
    const name = pkg.getNpmName();
    console.log(`  ${name}`);
    console.log(`    https://www.npmjs.com/package/${name}/access`);
  }
}

async function main() {
  const pkgs = packagesManager.getPublicPackages();
  console.log(
    `Checking ${pkgs.length} public package(s) against ${registry}\n`,
  );

  const willWrite = (bootstrap || setupTrust) && !dryRun;
  if (willWrite) {
    const authedUser = await checkAuth();
    if (!authedUser) {
      console.error(
        `npm whoami failed for ${registry}. Run 'npm login --registry ${registry}' (or set NPM_TOKEN) before re-running.`,
      );
      process.exit(1);
    }
    console.log(`Authenticated to ${registry} as ${authedUser}\n`);
  }

  /** @type {Array<import('../shared/PackageMetadata.mjs').PackageMetadata>} */
  const missing = [];
  /** @type {Array<import('../shared/PackageMetadata.mjs').PackageMetadata>} */
  const existing = [];
  for (const pkg of pkgs) {
    const name = pkg.getNpmName();
    process.stdout.write(`  ${name} ... `);
    const exists = await packageExistsOnRegistry(name);
    if (exists) {
      console.log('exists');
      existing.push(pkg);
    } else {
      console.log('NOT FOUND');
      missing.push(pkg);
    }
  }

  /** @type {string[]} */
  const failures = [];

  if (missing.length > 0) {
    if (!bootstrap) {
      console.log(
        `\n${missing.length} package(s) are not on the registry yet:`,
      );
      for (const pkg of missing) {
        console.log(`  - ${pkg.getNpmName()}`);
      }
      console.log(
        `\nRe-run with --bootstrap to publish placeholder stubs that claim ` +
          `these names, then configure trusted publishing on npmjs.com.`,
      );
    } else {
      console.log(
        `\nPublishing ${missing.length} placeholder stub(s) at version ${stubVersion}...`,
      );
      for (const pkg of missing) {
        try {
          await publishStub(pkg);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(
            `Failed to publish stub for ${pkg.getNpmName()}: ${message}`,
          );
          failures.push(pkg.getNpmName());
        }
      }
    }
  }

  // Packages that should get trust configured: everything that exists on
  // the registry, plus any stubs we just published.
  const trustCandidates = [
    ...existing,
    ...(bootstrap
      ? missing.filter(p => !failures.includes(p.getNpmName()))
      : []),
  ];

  // Pre-flight registry check: skip packages whose trust config already
  // matches what we'd configure. This avoids forcing the maintainer to
  // satisfy an OTP / web-auth challenge per package on re-runs. The check
  // is read-only and uses whatever npm auth token the user already has
  // configured locally — it never prompts.
  /** @type {Array<import('../shared/PackageMetadata.mjs').PackageMetadata>} */
  const trustToConfigure = [];
  /** @type {Array<import('../shared/PackageMetadata.mjs').PackageMetadata>} */
  const trustUnknown = [];
  if (trustCandidates.length > 0) {
    const token = await fetchAuthToken();
    console.log(`\nChecking existing trust configuration:`);
    for (const pkg of trustCandidates) {
      const name = pkg.getNpmName();
      process.stdout.write(`  ${name} ... `);
      const configs = await fetchTrustConfigs(name, token);
      if (configs === null) {
        console.log('unable to check');
        trustUnknown.push(pkg);
      } else if (configs.some(configMatches)) {
        console.log('already configured');
      } else {
        console.log('needs configuration');
        trustToConfigure.push(pkg);
      }
    }
  }

  // Anything we couldn't pre-check still needs `npm trust github` to be
  // attempted; npm itself will reject duplicate registrations.
  const toRegister = [...trustToConfigure, ...trustUnknown];

  if (setupTrust) {
    if (toRegister.length > 0) {
      console.log(
        `\n${toRegister.length} package(s) need a trusted publisher registered.`,
      );
      console.log(
        `\nOn the first OTP / web-auth prompt, open the URL npm prints in your`,
      );
      console.log(
        `browser and select "Skip two-factor authentication for the next 5`,
      );
      console.log(
        `minutes" — subsequent packages in this run will then go through`,
      );
      console.log(`without re-prompting.\n`);
      for (let i = 0; i < toRegister.length; i++) {
        const pkg = toRegister[i];
        // Brief pause between calls to stay under the registry's
        // E429 rate limit (npm docs recommend a short delay between
        // back-to-back `npm trust` calls).
        if (i > 0) {
          await sleep(2000);
        }
        const result = await addTrustConfig(pkg);
        if (result === 'failed') {
          failures.push(pkg.getNpmName());
        }
      }
    }
  } else if (toRegister.length > 0) {
    printManualSetup(toRegister);
  }

  if (failures.length > 0) {
    throw new Error(
      `Setup did not complete for ${failures.length} package(s):\n - ${failures.join(
        '\n - ',
      )}`,
    );
  }
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
