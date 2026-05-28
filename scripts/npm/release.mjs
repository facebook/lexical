#!/usr/bin/env node

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import minimist from 'minimist';
import readline from 'node:readline';

import {exec} from '../shared/childProcess.mjs';
import {packagesManager} from '../shared/packagesManager.mjs';

const argv = minimist(process.argv.slice(2));

const nonInteractive = argv['non-interactive'];
const dryRun = argv['dry-run'];
const ignorePreviouslyPublished = argv['ignore-previously-published'];
const channel = argv.channel;
const validChannels = new Set(['next', 'latest', 'nightly', 'dev']);
if (!validChannels.has(channel)) {
  console.error(`Invalid release channel: ${channel}`);
  process.exit(1);
}

async function publish() {
  const pkgs = packagesManager.getPublicPackages();
  if (!nonInteractive) {
    console.info(
      `You're about to publish:
    ${pkgs.map(pkg => pkg.getNpmName()).join('\n')}

    Type "publish" to confirm.`,
    );
    await waitForInput();
  }

  const failures = [];
  for (const pkg of pkgs) {
    console.info(`Publishing ${pkg.getNpmName()}...`);
    if (dryRun === undefined || dryRun === 0) {
      // Publish from the package root. pnpm rewrites `workspace:*` for us
      // and honors the `files` field so only the declared assets ship.
      const error = await exec(
        `cd ./packages/${pkg.getDirectoryName()} && pnpm publish --access public --tag ${channel} --no-git-checks --provenance`,
      ).then(
        () => null,
        err => {
          if (
            ignorePreviouslyPublished &&
            err &&
            typeof err.stderr === 'string' &&
            /You cannot publish over the previously published version/.test(
              err.stderr,
            )
          ) {
            console.info(`Ignoring previously published error`);
            return null;
          }
          console.error(`\nFailed to publish ${pkg.getNpmName()}:`);
          console.error(err);
          return err;
        },
      );
      if (error) {
        failures.push(pkg.getNpmName());
      }
      console.info(`Done!`);
    } else {
      console.info(`Dry run - skipping publish step.`);
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `Failed to publish ${failures.length} package(s):\n - ${failures.join(
        '\n - ',
      )}`,
    );
  }
}

/**
 * @returns {Promise<void>}
 */
async function waitForInput() {
  return new Promise(resolve => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });

    rl.on('line', function (line) {
      if (line === 'publish') {
        rl.close();
        resolve();
      }
    });
  });
}

publish().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
