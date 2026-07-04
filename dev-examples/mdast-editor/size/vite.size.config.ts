/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import * as path from 'node:path';
import {defineConfig} from 'vite';

import lexicalMonorepoPlugin from '../../../scripts/vite/lexicalMonorepoPlugin';

// Selected by size/measure.mjs: 'mdast' or 'legacy'.
const entry = process.env.SIZE_ENTRY === 'legacy' ? 'legacy' : 'mdast';

export default defineConfig({
  build: {
    emptyOutDir: true,
    lib: {
      entry: path.resolve(__dirname, `${entry}-entry.ts`),
      fileName: () => `${entry}.js`,
      formats: ['es'],
    },
    minify: true,
    outDir: path.resolve(__dirname, '..', 'dist-size', entry),
  },
  plugins: [lexicalMonorepoPlugin()],
});
