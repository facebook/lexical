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

import {exec} from '../shared/childProcess.mjs';
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
 * Run `npm trust github` for one package. The CLI is idempotent in spirit:
 * if the same (repository, workflow, environment) tuple is already
 * registered, it rejects with a duplicate-style error which we treat as
 * success.
 *
 * @param {import('../shared/PackageMetadata.mjs').PackageMetadata} pkg
 * @returns {Promise<'configured' | 'already-configured' | 'dry-run' | 'failed'>}
 */
async function addTrustConfig(pkg) {
  const name = pkg.getNpmName();
  const cmd =
    `npm trust github ${name} --file ${workflow} --repo ${repo} ` +
    `--registry ${registry} --allow-publish -y`;
  if (dryRun) {
    console.log(`  ${name} ... [dry-run] ${cmd}`);
    return 'dry-run';
  }
  try {
    await exec(cmd);
    console.log(`  ${name} ... configured`);
    return 'configured';
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stderr =
      err && typeof err === 'object' && 'stderr' in err
        ? String(/** @type {{stderr?: unknown}} */ (err).stderr || '')
        : '';
    const combined = `${message}\n${stderr}`;
    if (
      /already.*(trust|configur|exist)/i.test(combined) ||
      /\b409\b/.test(combined) ||
      /conflict/i.test(combined)
    ) {
      console.log(`  ${name} ... already configured`);
      return 'already-configured';
    }
    console.error(`  ${name} ... FAILED`);
    if (stderr.trim()) {
      console.error(
        stderr
          .trim()
          .split('\n')
          .map(l => `    ${l}`)
          .join('\n'),
      );
    }
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
  // the registry, plus any stubs we just published. The npm trust github
  // command short-circuits idempotently for packages that are already
  // configured (see addTrustConfig).
  const trustCandidates = [
    ...existing,
    ...(bootstrap
      ? missing.filter(p => !failures.includes(p.getNpmName()))
      : []),
  ];

  if (setupTrust) {
    if (trustCandidates.length > 0) {
      console.log(
        `\nConfiguring trusted publishing for ${trustCandidates.length} package(s)...`,
      );
      for (const pkg of trustCandidates) {
        const result = await addTrustConfig(pkg);
        if (result === 'failed') {
          failures.push(pkg.getNpmName());
        }
      }
    }
  } else if (trustCandidates.length > 0) {
    printManualSetup(trustCandidates);
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
