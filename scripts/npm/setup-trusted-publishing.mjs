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
  return name.startsWith('@') ? name.replaceAll('/', '%2F') : name;
}

/**
 * Read every `//<host>/:_authToken=<token>` line out of an .npmrc file
 * at the given path, returning a host → token map. Returns an empty
 * map when the file can't be read.
 *
 * @param {string} npmrcPath
 * @returns {Promise<Map<string, string>>}
 */
async function readNpmrcAuthTokens(npmrcPath) {
  /** @type {Map<string, string>} */
  const tokens = new Map();
  let contents = '';
  try {
    contents = await fs.readFile(npmrcPath, 'utf8');
  } catch {
    return tokens;
  }
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) {
      continue;
    }
    // Match  //registry.example.com/:_authToken=VALUE
    const m = line.match(/^\/\/([^/]+)\/:_authToken=(.+)$/);
    if (!m) {
      continue;
    }
    let value = m[2].trim();
    // Strip surrounding quotes if any
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    // Expand ${VAR} references against process.env
    value = value.replace(
      /\$\{([^}]+)\}/g,
      (_, name) => process.env[name] || '',
    );
    if (value) {
      tokens.set(m[1], value);
    }
  }
  return tokens;
}

/**
 * Read the npm auth token for the configured registry. Tries in
 * order: NPM_TOKEN env var, project ./.npmrc, user ~/.npmrc, then
 * `npm config get`. The direct-file paths handle the common macOS
 * web-auth case where `npm config get //host/:_authToken` resolves to
 * the literal string "undefined" even though the token is right there
 * in ~/.npmrc.
 *
 * @returns {Promise<{token: string | null, source: string}>}
 */
async function fetchAuthToken() {
  if (process.env.NPM_TOKEN) {
    const tok = process.env.NPM_TOKEN.trim();
    if (tok) {
      return {source: 'NPM_TOKEN env var', token: tok};
    }
  }
  const host = new URL(registry).host;
  const candidates = [
    {label: 'project .npmrc', path: path.resolve('.npmrc')},
    {label: 'user ~/.npmrc', path: path.join(os.homedir(), '.npmrc')},
  ];
  for (const {label, path: npmrcPath} of candidates) {
    const tokens = await readNpmrcAuthTokens(npmrcPath);
    const token = tokens.get(host);
    if (token) {
      return {source: label, token};
    }
  }
  try {
    const {stdout} = await exec(`npm config get //${host}/:_authToken`, {
      env: npmCleanEnv(),
    });
    const token = stdout.trim();
    if (token && token !== 'undefined') {
      return {source: 'npm config get', token};
    }
  } catch {
    // fall through
  }
  return {source: '', token: null};
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

// pnpm exports its own (and pnpm-only) settings as `npm_config_*` env
// vars when running scripts. npm 11+ warns about every one of these it
// doesn't recognise ("Unknown env config ...") and threatens to error
// in npm 12. The actual env var names use underscores in place of the
// hyphens you'd see in the config key (npm normalizes back to hyphens
// when reading), so we strip both spellings to cover all observed
// shapes.
const PNPM_ONLY_NPM_CONFIG_KEYS = [
  'npm-globalconfig',
  'verify-deps-before-run',
  '_jsr-registry',
  'manage-package-manager-versions',
];

/**
 * @returns {NodeJS.ProcessEnv}
 */
function npmCleanEnv() {
  const env = {...process.env};
  for (const key of PNPM_ONLY_NPM_CONFIG_KEYS) {
    delete env[`npm_config_${key}`];
    delete env[`npm_config_${key.replace(/-/g, '_')}`];
  }
  return env;
}

/**
 * Spawn `npm` with `stdio: ['inherit', 'inherit', 'pipe']` — keeps the
 * OTP / web-auth URL streaming to the terminal, but also captures
 * stderr so we can distinguish a benign "already-configured" 409 from
 * a real failure.
 *
 * @param {string[]} args
 * @returns {Promise<{code: number | null, signal: NodeJS.Signals | null, stderr: string}>}
 */
function runNpm(args) {
  return new Promise(resolve => {
    // Lazy import; keeps top of file tidy and avoids extra weight on
    // dry-run/check-only paths.
    import('node:child_process').then(({spawn: spawnCb}) => {
      const child = spawnCb('npm', args, {
        env: npmCleanEnv(),
        stdio: ['inherit', 'inherit', 'pipe'],
      });
      let stderr = '';
      if (child.stderr) {
        child.stderr.on('data', chunk => {
          process.stderr.write(chunk);
          stderr += chunk.toString();
        });
      }
      child.on('close', (code, signal) => {
        resolve({code, signal, stderr});
      });
      child.on('error', err => {
        resolve({code: -1, signal: null, stderr: stderr + String(err)});
      });
    });
  });
}

// Per-package retry policy for E429 (registry rate-limit). Exponential
// backoff starting at 5 s, capped at 60 s, up to 4 attempts total.
const MAX_TRUST_ATTEMPTS = 4;
const RATE_LIMIT_BACKOFF_BASE_MS = 5_000;
const RATE_LIMIT_BACKOFF_MAX_MS = 60_000;

/**
 * Run `npm trust github` for one package. stdio is wired up so the
 * OTP / web-auth URL streams to the terminal while we still capture
 * stderr to tell an `E409 Conflict` (the registry's way of saying
 * "this exact trust config already exists") apart from real failures,
 * and to back off and retry on `E429 Too Many Requests`.
 *
 * @param {import('../shared/PackageMetadata.mjs').PackageMetadata} pkg
 * @returns {Promise<'configured' | 'already-configured' | 'dry-run' | 'failed'>}
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
  for (let attempt = 1; attempt <= MAX_TRUST_ATTEMPTS; attempt++) {
    const {code, stderr} = await runNpm(args);
    if (code === 0) {
      console.log(`  ${name} ... configured\n`);
      return 'configured';
    }
    if (/code E409|409 Conflict/i.test(stderr)) {
      console.log(`  ${name} ... already configured (server returned 409)\n`);
      return 'already-configured';
    }
    if (
      /code E429|429 Too Many Requests/i.test(stderr) &&
      attempt < MAX_TRUST_ATTEMPTS
    ) {
      const backoff = Math.min(
        RATE_LIMIT_BACKOFF_MAX_MS,
        RATE_LIMIT_BACKOFF_BASE_MS * 2 ** (attempt - 1),
      );
      console.log(
        `  ${name} ... rate-limited (E429); waiting ${Math.round(backoff / 1000)}s before retry (attempt ${attempt + 1}/${MAX_TRUST_ATTEMPTS})`,
      );
      await sleep(backoff);
      continue;
    }
    console.error(`  ${name} ... FAILED (npm exit ${code})\n`);
    return 'failed';
  }
  console.error(
    `  ${name} ... FAILED (gave up after ${MAX_TRUST_ATTEMPTS} attempts)\n`,
  );
  return 'failed';
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
 * Ensure the local npm CLI supports `npm trust github`. The subcommand
 * was added in npm 11.5; we require 11.10+ to match the upstream
 * trusted-publishing docs.
 *
 * @returns {Promise<{ok: true, version: string} | {ok: false, reason: string}>}
 */
async function checkNpmTrustSupport() {
  /** @type {string} */
  let version;
  try {
    const {stdout} = await exec(`npm --version`);
    version = stdout.trim();
  } catch (err) {
    return {
      ok: false,
      reason: `Could not run 'npm --version': ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }
  const parts = version.split('.').map(n => parseInt(n, 10));
  const [major = 0, minor = 0] = parts;
  if (major < 11 || (major === 11 && minor < 10)) {
    return {
      ok: false,
      reason: `npm ${version} is too old for 'npm trust github'. Upgrade to npm >= 11.10 (\`npm i -g npm@latest\`) and re-run.`,
    };
  }
  try {
    await exec(`npm trust --help`);
  } catch (err) {
    return {
      ok: false,
      reason: `'npm trust' is not available in this npm (${version}): ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }
  return {ok: true, version};
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

  if (setupTrust && !dryRun) {
    const trustSupport = await checkNpmTrustSupport();
    if (!trustSupport.ok) {
      console.error(trustSupport.reason);
      process.exit(1);
    }
    console.log(`Using npm ${trustSupport.version} (supports 'npm trust')\n`);
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
    const {source, token} = await fetchAuthToken();
    if (token) {
      console.log(`\nUsing npm auth token from ${source} for trust pre-check.`);
    } else {
      console.log(
        `\nCould not locate an npm auth token (checked NPM_TOKEN, ./.npmrc, ~/.npmrc, and \`npm config get\`).`,
      );
      console.log(
        `Pre-check will be skipped; npm trust github will be attempted for every package.`,
      );
    }
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
