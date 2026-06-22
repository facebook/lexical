/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {defineConfig} from 'vite';

import lexicalMonorepoPlugin from '../../scripts/vite/lexicalMonorepoPlugin';

export default defineConfig({
  plugins: [lexicalMonorepoPlugin()],
  // Pinned so the Playwright config can point a webServer at it.
  preview: {port: 4327, strictPort: true},
  server: {port: 4327, strictPort: true},
});
