/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import babel from '@rollup/plugin-babel';
import commonjs from '@rollup/plugin-commonjs';
import react from '@vitejs/plugin-react';
import * as fs from 'node:fs';
import {createRequire} from 'node:module';
import * as path from 'node:path';
import {defineConfig} from 'vite';
import {replaceCodePlugin} from 'vite-plugin-replace';

import {NpmModuleExportEntry} from '../../scripts/shared/PackageMetadata';
import viteCopyEsm from './viteCopyEsm';

const require = createRequire(import.meta.url);
const {packagesManager} =
  require('../../scripts/shared/packagesManager') as typeof import('../../scripts/shared/packagesManager');

const moduleResolution = [
  ...packagesManager.getPublicPackages().flatMap((pkg) =>
    pkg
      .getNormalizedNpmModuleExportEntries()
      .map((entry: NpmModuleExportEntry) => {
        const [name, moduleExports] = entry;
        // Prefer the development esm version because we want nice errors and
        // introspection on the playground!
        const replacements = (['development', 'default'] as const).map((k) =>
          pkg.resolve('dist', moduleExports.import[k]),
        );
        const replacement = replacements.find((fn) => fs.existsSync(fn));
        if (!replacement) {
          throw new Error(
            `ERROR: Missing ./${path.relative(
              '../..',
              replacements[1],
            )}. Did you run \`npm run build\` in the monorepo first?`,
          );
        }
        return {
          find: name,
          replacement,
        };
      }),
  ),
  ...[packagesManager.getPackageByDirectoryName('shared')].flatMap((pkg) =>
    pkg.getPrivateModuleEntries().map(({name, sourceFileName}) => ({
      find: name,
      replacement: pkg.resolve('src', sourceFileName),
    })),
  ),
];

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    minify: 'terser',
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
          /[\\/]node_modules[\\/]@excalidraw\/excalidraw[\\/]/.test(warning.id)
        ) {
          return;
        }
        warn(warning);
      },
    },
    terserOptions: {
      compress: {
        toplevel: true,
      },
      keep_classnames: true,
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
    commonjs(),
  ],
  resolve: {
    alias: moduleResolution,
  },
});
