/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import tsconfigPaths from 'vite-tsconfig-paths';
import {defineConfig, mergeConfig, Plugin} from 'vitest/config';

function lexicalTestMocks(): Plugin {
  return {
    config(config, _env) {
      return mergeConfig(config, {
        resolve: {
          alias: {
            'shared/devInvariant':
              'packages/shared/src/__mocks__/devInvariant.ts',
            'shared/invariant': 'packages/shared/src/__mocks__/invariant.ts',
            'shared/warnOnlyOnce':
              'packages/shared/src/__mocks__/warnOnlyOnce.ts',
          },
        },
      });
    },
    name: 'lexicalTestMocks',
  };
}

export default defineConfig({
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
        plugins: [
          tsconfigPaths({projects: ['./tsconfig.test.json']}),
          lexicalTestMocks(),
        ],
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
    ],
  },
});
