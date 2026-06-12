/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import react from '@vitejs/plugin-react';
import {playwright} from '@vitest/browser-playwright';
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

// Browser-mode tests (packages/**/__tests__/browser) run in a real browser via
// Playwright instead of jsdom, so unit tests that lean heavily on jsdom mocks
// can be ported to a more realistic environment. The browsers to launch are
// taken from the comma-separated VITEST_BROWSER env var (default: chromium) so
// the default CI job can stay on linux + chromium while the extended matrix
// fans out across firefox/webkit and additional operating systems.
const browserInstances = (process.env.VITEST_BROWSER || 'chromium')
  .split(',')
  .map(name => name.trim())
  .filter(Boolean)
  .map(browser => ({browser}));

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
        define: {
          // https://react.dev/blog/2022/03/08/react-18-upgrade-guide#configuring-your-testing-environment
          IS_REACT_ACT_ENVIRONMENT: true,
        },
        extends: true,
        // Pre-bundle React (and react-dom/client) together so browser tests
        // that render React share a single React instance with the
        // source-aliased @lexical/react packages. Without this the optimized
        // react-dom/client bundle gets its own copy and hooks fail with a null
        // dispatcher ("Cannot read properties of null (reading 'useMemo')").
        optimizeDeps: {
          include: [
            'react',
            'react/jsx-dev-runtime',
            'react-dom',
            'react-dom/client',
          ],
        },
        plugins: [react()],
        test: {
          browser: {
            // Vitest's default browser server port (63315) is in the
            // ephemeral range, and Windows reserves randomized blocks of
            // that range (Hyper-V excluded port ranges), so on Windows CI
            // runners listen() occasionally fails with EACCES
            // (vitest-dev/vitest#9035). Pin a port below the ephemeral
            // range instead; if it happens to be busy, Vite falls back to
            // the next free port rather than failing.
            api: {port: 8315},
            enabled: true,
            // Headless everywhere by default so the suite runs the same way in
            // CI and in headless dev containers. Pass `--browser.headless=false`
            // (or use the Vitest UI) to debug in a real window locally.
            headless: true,
            instances: browserInstances,
            provider: playwright(),
          },
          env: {
            LEXICAL_VERSION: JSON.stringify(
              `${process.env.npm_package_version}+git`,
            ),
          },
          include: ['packages/**/__tests__/browser/**/*.test{.ts,.tsx}'],
          name: 'browser',
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
