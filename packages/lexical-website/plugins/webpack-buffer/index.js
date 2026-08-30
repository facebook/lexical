/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

module.exports = async function (context, options) {
  return {
    configureWebpack(config, isServer, {currentBundler}) {
      return {
        plugins: [
          new currentBundler.instance.ProvidePlugin({
            Buffer: ['buffer', 'Buffer'],
          }),
          function disableExpensiveBundlerOptimizationPlugin() {
            return {
              configureWebpack(_config, _isServer) {
                return {
                  optimization: {
                    concatenateModules: false,
                  },
                };
              },
              name: 'disable-expensive-bundler-optimizations',
            };
          },
        ],
        resolve: {
          fallback: {buffer: require.resolve('buffer/')},
        },
      };
    },
    name: 'webpack-buffer',
  };
};
