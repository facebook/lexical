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

// Consuming lexical via the `source` export condition needs zero extra
// config: imports resolve through normal package resolution
// (`@lexical/internal/*` is a real dependency, the react/test helpers are
// package-internal) and the dev/prod branch uses `process.env.NODE_ENV`,
// which Vite substitutes out of the box. The only opt-in is the `source`
// resolve condition.
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
  resolve: {
    conditions: ['source', 'development', 'module', 'browser', 'default'],
  },
});
