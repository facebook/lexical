/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// @ts-check
/* eslint-disable sort-keys-fix/sort-keys-fix */

import minimist from 'minimist';
import path from 'node:path';

import {PackageMetadata} from '../shared/PackageMetadata.mjs';
import npmToWwwName from '../www/npmToWwwName.mjs';

const argv = minimist(process.argv.slice(2));

const lexicalPkg = new PackageMetadata('packages/lexical/package.json');

// NOTE: This script is legacy from when npm workspaces were used.
// With pnpm, create packages manually using mkdir and a package.json template.
// See the maintainers guide for the current recommended workflow.
const workspace = argv.w || argv.workspace;
if (
  !Array.isArray(argv._) ||
  argv._.join(' ') !== 'init' ||
  typeof workspace !== 'string' ||
  !/^packages\/[^/]+$/.test(workspace)
) {
  throw new Error(
    'Legacy script: npm init -w is from npm workspaces era. With pnpm, create packages manually.',
  );
}
const pkgDirName = path.basename(workspace);

export default {
  name: pkgDirName.replace(/^lexical-/, '@lexical/'),
  description: '',
  keywords: ['lexical', 'editor'],
  version: lexicalPkg.packageJson.version,
  license: lexicalPkg.packageJson.license,
  repository: {...lexicalPkg.packageJson.repository, directory: workspace},
  main: `${npmToWwwName(pkgDirName)}.js`,
  types: 'index.d.ts',
};
