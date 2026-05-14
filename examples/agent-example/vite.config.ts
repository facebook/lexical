/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
import {defineConfig} from 'vite';

// onnxruntime-node and sharp are only reached via the Node entrypoint of
// @huggingface/transformers; the browser worker uses transformers.web.js,
// so alias them to a no-op stub for defense in depth (pnpm.overrides also
// resolves them to this stub at install time).
const emptyStub = fileURLToPath(
  new URL('./stubs/empty/index.js', import.meta.url),
);

export default defineConfig({
  optimizeDeps: {
    exclude: ['@huggingface/transformers'],
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      'onnxruntime-node': emptyStub,
      sharp: emptyStub,
    },
  },
  worker: {
    format: 'es',
  },
});
