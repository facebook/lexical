/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import react from '@vitejs/plugin-react';
import {playwright} from '@vitest/browser-playwright';
import {defineConfig} from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    browser: {
      enabled: true,
      headless: true,
      instances: [{browser: 'chromium'}],
      provider: playwright(),
    },
    include: ['src/__tests__/browser/**/*.test{.ts,.tsx}'],
  },
});
