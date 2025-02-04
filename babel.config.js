/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

module.exports = {
  plugins: [
    [
      require('./scripts/error-codes/transform-error-messages'),
      {noMinify: true},
    ],
    // When this plugin is enabled, the useBuiltIns option in @babel/preset-env must not be set. Otherwise, this plugin may not able to completely sandbox the environment.
    // https://babeljs.io/docs/babel-plugin-transform-runtime
    ['@babel/plugin-transform-runtime'],
  ],
  presets: [
    [
      '@babel/preset-env',
      {
        targets: {
          node: 'current',
        },
      },
    ],
    ['@babel/preset-react', {runtime: 'automatic'}],
    '@babel/preset-flow',
  ],
};
