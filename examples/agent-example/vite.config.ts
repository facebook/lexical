/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';

export default defineConfig({
  optimizeDeps: {
    exclude: ['@huggingface/transformers'],
  },
  plugins: [react(), tailwindcss()],
  worker: {
    format: 'es',
  },
});
