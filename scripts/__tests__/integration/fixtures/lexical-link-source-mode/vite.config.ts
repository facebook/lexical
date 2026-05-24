/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {defineConfig} from 'vite';

// Follow the symlinked lexical package back to the monorepo so we can
// alias the private `shared/*` module space that all lexical source
// files use. A normal npm consumer would either vendor `shared/`,
// publish their own copy via aliases, or stick to the compiled
// `development`/`production` conditions.
const fixtureDir = path.dirname(fileURLToPath(import.meta.url));
const lexicalRoot = fs.realpathSync(
  path.resolve(fixtureDir, 'node_modules/lexical'),
);
const sharedSrc = path.resolve(lexicalRoot, '..', 'shared', 'src');
if (!fs.existsSync(sharedSrc)) {
  throw new Error(
    `Expected to find the monorepo shared/ package at ${sharedSrc}. The ` +
      `source export condition only works when lexical is linked from a ` +
      `checkout that includes packages/shared.`,
  );
}

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve('src/main.ts'),
      fileName: 'main',
      formats: ['es'],
    },
    minify: false,
    rollupOptions: {
      output: {entryFileNames: 'main.mjs'},
    },
    sourcemap: false,
    target: 'es2022',
  },
  define: {
    __DEV__: 'true',
    'process.env.LEXICAL_VERSION': JSON.stringify('source-mode+integration'),
  },
  resolve: {
    alias: [
      {find: /^shared\/(.*)$/, replacement: `${sharedSrc}/$1.ts`},
      {find: /^shared$/, replacement: `${sharedSrc}/index.ts`},
    ],
    // `source` is consulted first; if the package doesn't ship one (or
    // the consumer doesn't opt in), Vite falls through to the standard
    // `development`/`import` chain.
    conditions: ['source', 'development', 'module', 'browser', 'default'],
  },
});
