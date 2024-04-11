/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// @ts-check
'use strict';

const fs = require('fs-extra');
const glob = require('glob');
const path = require('node:path');
const prettier = require('prettier');
const {packagesManager} = require('./shared/packagesManager');

/**
 * @typedef {Object} UpdateTsconfigOptions
 * @property {string} jsonFileName path to the tsconfig.json
 * @property {boolean} test true to include the test paths (default: false)
 * @property {Array<[string, Array<string>]>} extraPaths additional paths to add
 */

/**
 * @param {opts} UpdateTsconfigOptions
 */
function updateTsconfig({jsonFileName, test = false, extraPaths = []}) {
  const tsconfig = fs.readJsonSync(jsonFileName);
  const prev = JSON.stringify(tsconfig.compilerOptions.paths);
  const publicPaths = [];
  const privatePaths = [];
  const testPaths = [];
  const configDir = path.resolve(path.dirname(jsonFileName));
  for (const pkg of packagesManager.getPackages()) {
    const resolveRelative = (...subPaths) =>
      path
        .relative(configDir, pkg.resolve(...subPaths))
        .replace(/^(?!\.)/, './');

    if (pkg.isPrivate()) {
      if (pkg.getDirectoryName() !== 'shared') {
        continue;
      }
      for (const {name, sourceFileName} of pkg.getPrivateModuleEntries()) {
        privatePaths.push([name, [resolveRelative('src', sourceFileName)]]);
      }
    } else {
      for (const {name, sourceFileName} of pkg.getExportedNpmModuleEntries()) {
        publicPaths.push([name, [resolveRelative('src', sourceFileName)]]);
      }
    }
    if (test) {
      testPaths.push([`${pkg.getNpmName()}/src`, [resolveRelative('src')]]);
      for (const fn of glob.sync(
        pkg.resolve('src', '__tests__', 'utils', '*.{ts,tsx,mjs,jsx}'),
      )) {
        testPaths.push([
          `${pkg.getNpmName()}/src/__tests__/utils`,
          [resolveRelative(fn)],
        ]);
      }
    }
  }
  const paths = Object.fromEntries([
    ...extraPaths,
    ...publicPaths,
    ...privatePaths,
    ...testPaths,
  ]);
  if (JSON.stringify(paths) !== prev) {
    tsconfig.compilerOptions.paths = paths;
    fs.writeFileSync(
      jsonFileName,
      prettier.format(JSON.stringify(tsconfig), {filepath: jsonFileName}),
    );
  }
}
updateTsconfig({
  extraPaths: [],
  jsonFileName: './tsconfig.json',
  test: true,
});
updateTsconfig({
  extraPaths: [],
  jsonFileName: './tsconfig.build.json',
  test: false,
});
updateTsconfig({
  extraPaths: [['lexicalOriginal', ['../lexical/src/']]],
  jsonFileName: './packages/lexical-devtools/tsconfig.json',
  test: false,
});
