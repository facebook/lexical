/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
'use strict';
const glob = require('glob');
const path = require('node:path');
const fs = require('fs-extra');

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

module.exports = ['lexical', '@lexical/rich-text', '@lexical/plain-text'].map(
  sizeLimitConfig,
);
