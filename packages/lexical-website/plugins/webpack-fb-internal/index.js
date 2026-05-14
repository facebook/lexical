/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

/**
 * Defines `process.env.FB_INTERNAL` for the client bundle.
 *
 * Some sources gate Meta-internal-only dynamic imports (e.g. InternGalleryCards)
 * behind `if (process.env.FB_INTERNAL)`. Webpack still resolves those imports
 * statically unless the constant is substituted at build time, which would fail
 * the public build because the internal modules don't exist outside fbsource.
 *
 * This was previously provided by docusaurus-plugin-internaldocs-fb's
 * EnvironmentPlugin injection. With the preset removed for the public site,
 * this small plugin keeps the same substitution.
 */
module.exports = async function () {
  return {
    configureWebpack(_config, _isServer, {currentBundler}) {
      return {
        plugins: [
          new currentBundler.instance.DefinePlugin({
            'process.env.FB_INTERNAL': JSON.stringify(
              process.env.FB_INTERNAL || '',
            ),
          }),
        ],
      };
    },
    name: 'webpack-fb-internal',
  };
};
