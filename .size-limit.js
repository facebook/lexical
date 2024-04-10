/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
'use strict';

/**
 * We use this file to configure the size-lmit tool, rather than their simpler
 * yaml package.json configuration, because we need to override the resolution
 * of modules to ensure we are pulling in monorepo build products as
 * dependencies rather than trying to use something stale from node_modules.
 */
const glob = require('glob');
const path = require('node:path');
const fs = require('fs-extra');

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
const alias = Object.fromEntries(
  glob('./packages/*/package.json', {sync: true}).flatMap((fn) => {
    const pkg = fs.readJsonSync(fn);
    if (!pkg.private) {
      return Object.entries(pkg.exports).flatMap(([k, v]) => {
        if (k.endsWith('.js')) {
          return [];
        }
        return [
          [
            `${pkg.name}${k.replace(/^\.(\/$)?/, '')}`,
            path.resolve(path.dirname(fn), 'dist', v.require.default),
          ],
        ];
      });
    }
    return [];
  }),
);

const extendConfig = {resolve: {alias}};
const modifyWebpackConfig = (config) => Object.assign(config, extendConfig);

function sizeLimitConfig(pkg) {
  return {
    path: alias[pkg],
    modifyWebpackConfig,
  };
}

/**
 * These are the packages that were measured previously in #3600
 * We could consider adding more packages and/or also measuring
 * other build combinations such as esbuild/webpack, mjs/cjs, dev/prod, etc.
 *
 * The current configuration measures only: webpack + cjs + prod.
 *
 * In order to also measure dev, we would want to change the size script in
 * package.json to run build-release instead of build-prod so both
 * dev and prod artifacts would be available.
 */
module.exports = ['lexical', '@lexical/rich-text', '@lexical/plain-text'].map(
  sizeLimitConfig,
);
