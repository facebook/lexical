/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import babel from '@rollup/plugin-babel';
import {createRequire} from 'node:module';
import {defineConfig} from 'vite';
import {replaceCodePlugin} from 'vite-plugin-replace';

import moduleResolution from '../../packages/shared/viteModuleResolution';

const require = createRequire(import.meta.url);

// https://vitejs.dev/config/
export default defineConfig(({command}) => {
  return {
    build: {
      outDir: 'build',
      rollupOptions: {
        input: {
          main: new URL('./index.html', import.meta.url).pathname,
          split: new URL('./split/index.html', import.meta.url).pathname,
        },
        onwarn(warning, warn) {
          if (
            warning.code === 'EVAL' &&
            warning.id &&
            /[\\/]node_modules[\\/]@excalidraw\/excalidraw[\\/]/.test(
              warning.id,
            )
          ) {
            return;
          }
          warn(warning);
        },
      },
    },
    define: {
      'process.env.IS_PREACT': process.env.IS_PREACT,
    },
    plugins: [
      replaceCodePlugin({
        replacements: [
          {
            from: /__DEV__/g,
            to: 'true',
          },
          {
            from: 'process.env.LEXICAL_VERSION',
            to: JSON.stringify(`${process.env.npm_package_version}+git`),
          },
        ],
      }),
      babel({
        babelHelpers: 'bundled',
        babelrc: false,
        configFile: false,
        exclude: '/**/node_modules/**',
        extensions: ['jsx', 'js', 'ts', 'tsx', 'mjs'],
        plugins: [
          '@babel/plugin-transform-flow-strip-types',
          [
            require('../../scripts/error-codes/transform-error-messages'),
            {
              noMinify: true,
            },
          ],
        ],
        presets: [['@babel/preset-react', {runtime: 'automatic'}]],
      }),
    ],
    resolve: {
      alias: moduleResolution(command === 'serve' ? 'source' : 'development'),
    },
  };
});
