/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// @ts-check
'use strict';

const glob = require('glob');
const fs = require('fs-extra');
const argv = require('minimist')(process.argv.slice(2));

async function main() {
  if (argv._.length !== 1) {
    throw new Error(
      'USAGE: node ./scripts/update-unreleased-dependencies EXAMPLE_DIRECTORY',
    );
  }
  argv._.flatMap((path) =>
    glob.sync(`${path}/package.json`, {windowsPathsNoEscape: true}),
  ).forEach((fn) => {
    const {lexicalUnreleasedDependencies, ...json} = fs.readJsonSync(fn);
    if (!lexicalUnreleasedDependencies || !json.dependencies) {
      return;
    }
    json.dependencies = Object.fromEntries(
      Object.entries({
        ...json.dependencies,
        ...lexicalUnreleasedDependencies,
      }).sort(([a], [b]) => a.localeCompare(b)),
    );
    fs.writeJsonSync(fn, json, {spaces: 2});
  });
}

main();
