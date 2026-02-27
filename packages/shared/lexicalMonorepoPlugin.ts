/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {defineConfig, mergeConfig, type Plugin} from 'vite';

import viteModuleResolution from './viteModuleResolution';

export default function lexicalMonorepoPlugin(): Plugin {
  return {
    config(config, env) {
      return mergeConfig(
        defineConfig({
          define: {
            __DEV__: env.mode !== 'production',
            'process.env.IS_PREACT': process.env.IS_PREACT,
            'process.env.LEXICAL_VERSION': JSON.stringify(
              `${process.env.npm_package_version}+git`,
            ),
          },
          resolve: {
            alias: viteModuleResolution(
              env.mode === 'production'
                ? 'production'
                : env.command === 'serve'
                  ? 'source'
                  : 'development',
              env.isSsrBuild,
            ),
          },
        }),
        config,
      );
    },
    name: 'lexicalMonorepoPlugin',
  };
}
