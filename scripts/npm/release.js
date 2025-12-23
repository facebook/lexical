#!/usr/bin/env node

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

const readline = require('readline');
const {exec} = require('child-process-promise');
const {packagesManager} = require('../shared/packagesManager');
const argv = require('minimist')(process.argv.slice(2));

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
    ${pkgs.map((pkg) => pkg.getNpmName()).join('\n')}

    Type "publish" to confirm.`,
    );
    await waitForInput();
  }

  for (const pkg of pkgs) {
    console.info(`Publishing ${pkg.getNpmName()}...`);
    if (dryRun === undefined || dryRun === 0) {
      await exec(
        `cd ./packages/${pkg.getDirectoryName()}/npm && pnpm publish --access public --tag ${channel}`,
      ).catch((err) => {
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
        return err;
      });
      console.info(`Done!`);
    } else {
      console.info(`Dry run - skipping publish step.`);
    }
  }
}

async function waitForInput() {
  return new Promise((resolve) => {
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

publish();
