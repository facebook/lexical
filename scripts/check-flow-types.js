/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

const {spawn} = require('child_process');

async function runFlow(renderer, args) {
  return new Promise((resolve) => {
    let cmd = __dirname + '/../node_modules/.bin/flow';
    if (process.platform === 'win32') {
      cmd = cmd.replace(/\//g, '\\') + '.cmd';
    }

    console.log('Running Flow...');

    spawn(cmd, args, {
      // Allow colors to pass through:
      stdio: 'inherit',
    }).on('close', function (code) {
      if (code !== 0) {
        console.error('Flow failed :(');
        console.log();
        process.exit(code);
      } else {
        resolve();
      }
    });
  });
}

runFlow();
