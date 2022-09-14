/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

const webpack = require('webpack');

module.exports = async function (context, options) {
  return {
    configureWebpack(config, isServer, utils) {
      return {
        plugins: [new webpack.ProvidePlugin({Buffer: ['buffer', 'Buffer']})],
        resolve: {
          fallback: {buffer: require.resolve('buffer/')},
        },
      };
    },
    name: 'webpack-buffer',
  };
};
