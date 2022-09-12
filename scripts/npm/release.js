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
const {LEXICAL_PKG, DEFAULT_PKGS} = require('./packages');
const argv = require('minimist')(process.argv.slice(2));

const nonInteractive = argv['non-interactive'];
const dryRun = argv['dry-run'];
const channel = argv.channel;
const validChannels = new Set(['next', 'latest']);
if (!validChannels.has(channel)) {
  console.error(`Invalid release channel: ${channel}`);
  process.exit(1);
}

async function publish() {
  const pkgs = [LEXICAL_PKG, ...DEFAULT_PKGS];
  if (!nonInteractive) {
    console.info(
      `You're about to publish:
    ${pkgs.join('\n')}

    Type "publish" to confirm.`,
    );
    await waitForInput();
  }

  for (let i = 0; i < pkgs.length; i++) {
    const pkg = pkgs[i];
    console.info(`Publishing ${pkg}...`);
    if (dryRun === undefined || dryRun === 0) {
      await exec(
        `cd ./packages/${pkg}/npm && npm publish --access public --tag ${channel}`,
      );
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
