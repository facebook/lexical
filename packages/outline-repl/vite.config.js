/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {flowPlugin, esbuildFlowPlugin} from '@bunchtogether/vite-plugin-flow';
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  optimizeDeps: {
    esbuildOptions: {
      plugins: [esbuildFlowPlugin()],
    },
  },
  plugins: [flowPlugin(), react()],
  server: {
    port: 3030,
  },
});
