/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import react from '@vitejs/plugin-react';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {fileURLToPath} from 'node:url';
import {defineConfig} from 'vitest/config';

// Resolve monorepo imports to TypeScript source from the test tsconfig's
// `paths`. This includes the cross-package and deep `*/src/__tests__/utils`
// aliases that the unit tests rely on but that the lean root tsconfig (which
// resolves via the `source` export condition) intentionally omits. Vite's
// native `resolve.tsconfigPaths` only reads the root tsconfig, so we build
// the aliases explicitly from tsconfig.test.json instead.
const ROOT_DIR = path.dirname(fileURLToPath(import.meta.url));
const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function tsconfigTestAliases(): {find: RegExp; replacement: string}[] {
  const {compilerOptions} = JSON.parse(
    fs.readFileSync(path.join(ROOT_DIR, 'tsconfig.test.json'), 'utf8'),
  );
  return Object.entries(
    (compilerOptions.paths || {}) as Record<string, string[]>,
  ).map(([find, [replacement]]) => {
    // Wildcard entries like `lexical/src/*` -> `./packages/lexical/src/*`
    // become a capture-group alias so deep source imports resolve.
    if (find.endsWith('/*') && replacement.endsWith('/*')) {
      return {
        find: new RegExp(`^${escapeRegExp(find.slice(0, -2))}/(.*)$`),
        replacement: `${path.resolve(ROOT_DIR, replacement.slice(0, -2))}/$1`,
      };
    }
    return {
      find: new RegExp(`^${escapeRegExp(find)}$`),
      replacement: path.resolve(ROOT_DIR, replacement),
    };
  });
}

export default defineConfig({
  resolve: {
    alias: tsconfigTestAliases(),
    conditions: ['development', 'import', 'module', 'browser', 'default'],
    dedupe: ['react', 'react-dom'],
  },
  test: {
    clearMocks: true,
    projects: [
      {
        define: {
          // https://react.dev/blog/2022/03/08/react-18-upgrade-guide#configuring-your-testing-environment
          IS_REACT_ACT_ENVIRONMENT: true,
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
      {
        extends: true,
        test: {
          benchmark: {
            exclude: ['**/node_modules/**', '**/__bench__/dom/**'],
            include: ['packages/*/src/__bench__/*.bench.ts'],
          },
          environment: 'node',
          name: 'bench',
        },
      },
      {
        define: {
          IS_REACT_ACT_ENVIRONMENT: true,
        },
        extends: true,
        plugins: [react()],
        test: {
          benchmark: {
            exclude: ['**/node_modules/**'],
            include: ['packages/*/src/__bench__/dom/**/*.bench.ts'],
          },
          env: {
            LEXICAL_VERSION: JSON.stringify(
              `${process.env.npm_package_version}+git`,
            ),
          },
          environment: 'jsdom',
          name: 'bench-dom',
          setupFiles: ['./vitest.setup.mts'],
          typecheck: {
            tsconfig: './tsconfig.test.json',
          },
        },
      },
    ],
  },
});
