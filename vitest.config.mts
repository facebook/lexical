/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {defineConfig, mergeConfig, Plugin} from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

function lexicalTestMocks(): Plugin {
  return {
    name: 'lexicalTestMocks',
    config(config, _env) {
      return mergeConfig(config, {
        resolve: {
          alias: {
            'shared/invariant': 'packages/shared/src/__mocks__/invariant.ts',
            'shared/devInvariant':
              'packages/shared/src/__mocks__/devInvariant.ts',
            'shared/warnOnlyOnce':
              'packages/shared/src/__mocks__/warnOnlyOnce.ts',
          },
        },
      });
    },
  };
}

export default defineConfig({
  test: {
    typecheck: {
      tsconfig: './tsconfig.test.json',
    },
    setupFiles: ['./vitest.setup.mts'],
    clearMocks: true,
    projects: [
      {
        plugins: [
          tsconfigPaths({projects: ['./tsconfig.test.json']}),
          lexicalTestMocks(),
        ],
        extends: true,
        define: {
          // https://react.dev/blog/2022/03/08/react-18-upgrade-guide#configuring-your-testing-environment
          IS_REACT_ACT_ENVIRONMENT: true,
          __DEV__: true,
        },
        test: {
          environment: 'jsdom',
          include: [
            'packages/*/src/__tests__/unit/**/*.test{.ts,.tsx,.js,.jsx}',
          ],
          name: 'unit',
        },
      },
    ],
  },
});

// module.exports = {
//     {
//       ...common,
//       displayName: 'integration',
//       globalSetup: './scripts/__tests__/integration/setup.js',
//       testMatch: ['**/scripts/__tests__/integration/**/*.test.js'],
//     },
//     {
//       ...common,
//       displayName: 'e2e',
//       testMatch: [
//         '**/__tests__/e2e/**/*.js',
//         '**/__tests__/regression/**/*.js',
//       ],
//     },
//   ],
// };
