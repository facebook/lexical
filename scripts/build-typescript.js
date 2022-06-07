/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const path = require('path');
const {exec} = require('child_process');

const buildTypescript = (inputFile, outputPath) => {
  return {
    buildEnd: (err) => {
      if (err) {
        return;
      }
      exec(
        `tsc ${inputFile} --declaration --emitDeclarationOnly --declarationDir ${path.resolve(
          outputPath,
        )}`,
      );
    },
    name: 'generate-ts-declarations',
  };
};

module.exports = buildTypescript;
