/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import react from '@vitejs/plugin-react';
import * as path from 'node:path';
import {defineConfig} from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {find: '~', replacement: path.resolve(__dirname, 'src')},
      {
        find: 'styled-system',
        replacement: path.resolve(__dirname, 'styled-system'),
      },
    ],
  },
});
