/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {defineConfig} from 'vitest/config';

export default defineConfig({
  define: {
    __DEV__: true,
  },
  test: {
    environment: 'jsdom',
    include: ['src/__tests__/unit/**/*.test{.ts,.tsx}'],
  },
});
