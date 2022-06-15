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

async function publish() {
  const pkgs = [LEXICAL_PKG, ...DEFAULT_PKGS];

  console.info(
    `You're about to publish:
${pkgs.join('\n')}

Type "publish" to confirm.`,
  );
  await waitForInput();

  for (let i = 0; i < pkgs.length; i++) {
    const pkg = pkgs[i];
    await exec(`cd ./packages/${pkg}/npm && npm publish --access public`);
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
