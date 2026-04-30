/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// @ts-check

import fs from 'fs-extra';
import {glob} from 'glob';
import minimist from 'minimist';

import {exec} from './shared/childProcess.mjs';

const argv = minimist(process.argv.slice(2));

async function main() {
  const {version} = argv;
  if (!version) {
    throw new Error('USAGE: node ./scripts/override-react --version=beta');
  }
  const packages = ['react', 'react-dom'];
  [
    'package.json',
    ...glob.sync('./packages/*/package.json', {windowsPathsNoEscape: true}),
  ].forEach(fn => {
    const json = fs.readJsonSync(fn);
    const isRoot = fn === 'package.json';
    let didUpdate = isRoot;
    if (isRoot) {
      json.overrides ||= {};
      Object.assign(
        json.overrides,
        Object.fromEntries(packages.map(pkg => [pkg, '$' + pkg])),
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
  const cmd = `pnpm add -w ${packages.map(pkg => `${pkg}@${version}`).join(' ')}`;
  console.log(cmd);
  await exec(cmd);
  await exec(
    `git checkout pnpm-lock.yaml package.json packages/*/package.json`,
  );
}

main();
