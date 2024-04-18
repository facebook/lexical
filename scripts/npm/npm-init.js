/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// @ts-check
// npm-init can not use strict mode because PromZard is very strange
// and does not simply require this module
/* eslint-disable strict */
/* eslint-disable sort-keys-fix/sort-keys-fix */

const path = require('node:path');
const npmToWwwName = require('../www/npmToWwwName');
const argv = require('minimist')(process.argv.slice(2));
const {PackageMetadata} = require('../shared/PackageMetadata');

const lexicalPkg = new PackageMetadata('packages/lexical/package.json');

// npm doesn't give us a way to discover the -w argument so
const workspace = argv.w || argv.workspace;
if (
  !Array.isArray(argv._) ||
  argv._.join(' ') !== 'init' ||
  typeof workspace !== 'string' ||
  !/^packages\/[^/]+$/.test(workspace)
) {
  throw new Error(
    'Expecting to be called as npm init -w packages/PACKAGE_NAME',
  );
}
const pkgDirName = path.basename(workspace);

module.exports = {
  name: pkgDirName.replace(/^lexical-/, '@lexical/'),
  description: '',
  keywords: ['lexical', 'editor'],
  version: lexicalPkg.packageJson.version,
  license: lexicalPkg.packageJson.license,
  repository: {...lexicalPkg.packageJson.repository, directory: workspace},
  main: `${npmToWwwName(pkgDirName)}.js`,
  types: 'index.d.ts',
};
