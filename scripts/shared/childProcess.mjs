/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {exec as execCb, spawn as spawnCb} from 'node:child_process';
import {promisify} from 'node:util';

export const exec = promisify(execCb);

/**
 * @param {string} command
 * @param {string[]} args
 * @param {import('child_process').SpawnOptions} [options]
 * @returns {Promise<void>}
 */
export function spawn(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawnCb(command, args, options);
    child.on('close', code => {
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
