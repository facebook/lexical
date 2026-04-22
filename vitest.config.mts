/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import react from '@vitejs/plugin-react';
import {defineConfig} from 'vitest/config';

export default defineConfig({
  resolve: {
    conditions: ['development', 'import', 'module', 'browser', 'default'],
    dedupe: ['react', 'react-dom'],
    tsconfigPaths: true,
  },
  test: {
    clearMocks: true,
    projects: [
      {
        define: {
          // https://react.dev/blog/2022/03/08/react-18-upgrade-guide#configuring-your-testing-environment
          IS_REACT_ACT_ENVIRONMENT: true,
          __DEV__: true,
        },
        extends: true,
        plugins: [react()],
        test: {
          env: {
            LEXICAL_VERSION: JSON.stringify(
              `${process.env.npm_package_version}+git`,
            ),
          },
          environment: 'jsdom',
          include: ['packages/**/__tests__/unit/**/*.test{.ts,.tsx,.js,.jsx}'],
          name: 'unit',
          setupFiles: ['./vitest.setup.mts'],
          typecheck: {
            tsconfig: './tsconfig.test.json',
          },
        },
      },
      {
        extends: true,
        test: {
          environment: 'node',
          include: ['scripts/**/__tests__/unit/**/*.test.ts'],
          name: 'scripts-unit',
        },
      },
      {
        extends: true,
        test: {
          environment: 'node',
          globalSetup: './scripts/__tests__/integration/setup.mjs',
          include: ['scripts/__tests__/integration/**/*.test.mjs'],
          name: 'integration',
        },
      },
    ],
  },
});
