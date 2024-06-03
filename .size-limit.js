/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
'use strict';

/**
 * We use this file to configure the size-limit tool, rather than their simpler
 * yaml package.json configuration, because we need to override the resolution
 * of modules to ensure we are pulling in monorepo build products as
 * dependencies rather than trying to use something stale from node_modules.
 */
const glob = require('glob');
const path = require('node:path');

/**
 * Build a alias map so that we can be sure that we are resolving monorepo
 * dependencies to their corresponding build products and not some combination
 * of a build product and a possibly stale/divergent version in node_modules.
 *
 * Looks like:
 *
 *   {
 *     lexical: 'packages/lexical/dist/index.js',
 *     '@lexical/rich-text': 'packages/lexical-rich-text/dist/index.js',
 *   }
 *
 * Currently this alias map points at the cjs version of the build product,
 * as that is what was measured previously in #3600.
 */
const {packagesManager} = require('./scripts/shared/packagesManager');
const getAliasType = (type) =>
  Object.fromEntries(
    packagesManager
      .getPublicPackages()
      .flatMap((pkg) =>
        pkg
          .getNormalizedNpmModuleExportEntries()
          .map(([k, v]) => [k, pkg.resolve('dist', v[type].default)]),
      ),
  );

const modifyWebpackConfigForType = (config, alias) =>
  Object.assign(config, {resolve: {alias}});

function sizeLimitConfig(pkg) {
  return ['require', 'import'].map((type) => {
    const aliasType = getAliasType(type);
    return {
      import: '*',
      path:
        aliasType[pkg] != null
          ? aliasType[pkg]
          : Object.keys(aliasType)
              .filter((k) => k.startsWith(pkg))
              .map((k) => aliasType[k]),
      modifyWebpackConfig: (config) =>
        modifyWebpackConfigForType(config, aliasType),
      running: false,
      name: pkg + ' - ' + (type === 'require' ? 'cjs' : 'esm'),
    };
  });
}

/**
 * We could consider adding more packages and/or also measuring
 * other build combinations such as esbuild/webpack.
 *
 * The current configuration measures only: webpack + esm/cjs + prod.
 *
 */
module.exports = [
  'lexical',
  '@lexical/rich-text',
  '@lexical/plain-text',
  '@lexical/react',
].flatMap(sizeLimitConfig);
