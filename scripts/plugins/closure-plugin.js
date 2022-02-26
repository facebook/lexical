/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

'use strict';

const ClosureCompiler = require('google-closure-compiler').compiler;
const {promisify} = require('util');
const fs = require('fs');
const tmp = require('tmp');

const writeFileAsync = promisify(fs.writeFile);

function compile(flags) {
  return new Promise((resolve, reject) => {
    const closureCompiler = new ClosureCompiler(flags);
    closureCompiler.run(function (exitCode, stdOut, stdErr) {
      if (!stdErr) {
        resolve(stdOut);
      } else {
        reject(new Error(stdErr));
      }
    });
  });
}

module.exports = function closure(flags = {}) {
  return {
    name: 'scripts/plugins/closure-plugin',
    async renderChunk(code) {
      const inputFile = tmp.fileSync();
      const tempPath = inputFile.name;
      flags = Object.assign({}, flags, {js: tempPath});
      await writeFileAsync(tempPath, code, 'utf8');
      const compiledCode = await compile(flags);
      inputFile.removeCallback();
      return {code: compiledCode};
    },
  };
};
