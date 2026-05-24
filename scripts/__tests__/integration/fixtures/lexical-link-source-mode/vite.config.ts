/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {defineConfig} from 'vite';

// Consuming lexical via the `source` export condition needs no aliases:
// lexical's source imports resolve through normal package resolution
// (`@lexical/internal/*` is a real dependency, the react/test helpers are
// package-internal). The only consumer-side setup is opting into the
// `source` condition and defining the `__DEV__` build-time global.
const fixtureDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(fixtureDir, 'src/main.ts'),
      fileName: 'main',
      formats: ['es'],
    },
    minify: false,
    rollupOptions: {output: {entryFileNames: 'main.mjs'}},
    sourcemap: false,
    target: 'es2022',
  },
  define: {__DEV__: 'true'},
  resolve: {
    conditions: ['source', 'development', 'module', 'browser', 'default'],
  },
});
