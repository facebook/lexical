/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import babel from '@rollup/plugin-babel';
import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';
import {replaceCodePlugin} from 'vite-plugin-replace';

import moduleResolution from '../shared/viteModuleResolution';
import viteCopyEsm from './viteCopyEsm';

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    commonjsOptions: {include: []},
    minify: 'terser',
    outDir: 'build',
    rollupOptions: {
      input: {
        main: new URL('./index.html', import.meta.url).pathname,
        split: new URL('./split/index.html', import.meta.url).pathname,
      },
    },
    terserOptions: {
      compress: {
        toplevel: true,
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
      ],
    }),
    babel({
      babelHelpers: 'bundled',
      babelrc: false,
      configFile: false,
      exclude: '/**/node_modules/**',
      extensions: ['jsx', 'js', 'ts', 'tsx', 'mjs'],
      plugins: ['@babel/plugin-transform-flow-strip-types'],
      presets: ['@babel/preset-react'],
    }),
    react(),
    viteCopyEsm(),
  ],
  resolve: {
    alias: moduleResolution,
  },
});
