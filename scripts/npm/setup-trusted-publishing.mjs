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
        `(Could not deprecate ${name}@${stubVersion}: ${err.message || err})`,
      );
    });
  } finally {
    await fs.remove(tmpDir);
  }
}

/**
 * @param {Array<import('../shared/PackageMetadata.mjs').PackageMetadata>} pkgs
 */
function printTrustedPublishingSetup(pkgs) {
  console.log('\n--- Trusted publishing setup ---');
  console.log(
    'On npmjs.com, configure each package below as a trusted publisher with:',
  );
  console.log('  Publisher:         GitHub Actions');
  console.log(`  Repository owner:  ${repoOwner}`);
  console.log(`  Repository name:   ${repoName}`);
  console.log(`  Workflow filename: ${workflow}`);
  console.log('  Environment:       (leave empty)');
  console.log('');
  for (const pkg of pkgs) {
    const name = pkg.getNpmName();
    console.log(`  ${name}`);
    console.log(`    https://www.npmjs.com/package/${name}/access`);
  }
}

async function checkAuthForBootstrap() {
  try {
    const {stdout} = await exec(`npm whoami --registry ${registry}`);
    console.log(`Authenticated to ${registry} as ${stdout.trim()}\n`);
  } catch {
    console.error(
      `npm whoami failed for ${registry}. Run 'npm login --registry ${registry}' (or set NPM_TOKEN) before re-running with --bootstrap.`,
    );
    process.exit(1);
  }
}

async function main() {
  const pkgs = packagesManager.getPublicPackages();
  console.log(
    `Checking ${pkgs.length} public package(s) against ${registry}\n`,
  );

  if (bootstrap && !dryRun) {
    await checkAuthForBootstrap();
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
  if (missing.length === 0) {
    console.log(
      `\nAll ${pkgs.length} package(s) already exist on the registry.`,
    );
  } else if (!bootstrap) {
    console.log(`\n${missing.length} package(s) are not on the registry yet:`);
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

  const setupCandidates = bootstrap
    ? [...existing, ...missing.filter(p => !failures.includes(p.getNpmName()))]
    : existing;
  if (setupCandidates.length > 0) {
    printTrustedPublishingSetup(setupCandidates);
  }

  if (failures.length > 0) {
    throw new Error(
      `Failed to publish ${failures.length} stub(s):\n - ${failures.join(
        '\n - ',
      )}`,
    );
  }
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
