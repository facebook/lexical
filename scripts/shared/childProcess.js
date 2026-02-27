/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

const {exec: execCb, spawn: spawnCb} = require('child_process');
const {promisify} = require('util');

const exec = promisify(execCb);

/**
 * @param {string} command
 * @param {string[]} args
 * @param {import('child_process').SpawnOptions} [options]
 * @returns {Promise<void>}
 */
function spawn(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawnCb(command, args, options);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        const err = new Error(`Command "${command}" exited with code ${code}`);
        err.code = code;
        reject(err);
      }
    });
    child.on('error', reject);
  });
}

exports.exec = exec;
exports.spawn = spawn;
