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
const {exec} = require('child-process-promise');

async function main() {
  const {version} = argv;
  if (!version) {
    throw new Error('USAGE: node ./scripts/override-react --version=beta');
  }
  const packages = ['react', 'react-dom'];
  [
    'package.json',
    ...glob.sync('./packages/*/package.json', {windowsPathsNoEscape: true}),
  ].forEach((fn) => {
    const json = fs.readJsonSync(fn);
    const isRoot = fn === 'package.json';
    let didUpdate = isRoot;
    if (isRoot) {
      json.overrides ||= {};
      Object.assign(
        json.overrides,
        Object.fromEntries(packages.map((pkg) => [pkg, '$' + pkg])),
      );
    } else if (json.dependencies) {
      for (const k of packages) {
        if (json.dependencies[k]) {
          json.dependencies[k] = '*';
          didUpdate = true;
        }
      }
    }
    if (didUpdate) {
      fs.writeJsonSync(fn, json, {spaces: 2});
    }
  });
  const cmd = `npm i ${packages.map((pkg) => `${pkg}@${version}`).join(' ')}`;
  console.log(cmd);
  await exec(cmd);
  await exec(
    `git checkout package-lock.json package.json packages/*/package.json`,
  );
}

main();
