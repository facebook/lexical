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
    '@babel/plugin-proposal-optional-catch-binding',
  ],
  presets: [
    [
      '@babel/preset-env',
      {
        targets: 'es2019',
      },
    ],
    '@babel/preset-react',
    '@babel/preset-flow',
  ],
};
