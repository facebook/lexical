/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {devices} from '@playwright/test';

const {CI, E2E_EDITOR_MODE, PWDEBUG} = process.env;
const IS_CI = CI === 'true';
// PWDEBUG=1 is set by Playwright's `--debug` flag before this config loads;
// retries during a debug run only add confusion (the test already paused once).
const IS_DEBUG = PWDEBUG === '1';
const IS_COLLAB =
  E2E_EDITOR_MODE === 'rich-text-with-collab' ||
  E2E_EDITOR_MODE === 'rich-text-with-collab-v2';
// Collab mode needs extra horizontal space because the contextual menu is
// hardcoded to the right side; non-collab needs enough room that text
// doesn't wrap and break CMD+ArrowRight/Left navigation.
const viewport = {height: 1000, width: IS_COLLAB ? 3000 : 1250};

const config = {
  forbidOnly: IS_CI,
  projects: [
    {
      name: 'chromium',
      testDir: './packages/lexical-playground/__tests__/',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          slowMo: 50,
        },
        userAgent: undefined,
        viewport,
      },
    },
    {
      name: 'firefox',
      testDir: './packages/lexical-playground/__tests__/',
      use: {
        ...devices['Desktop Firefox'],
        launchOptions: {
          slowMo: 50,
        },
        userAgent: undefined,
        viewport,
      },
    },
    {
      name: 'webkit',
      testDir: './packages/lexical-playground/__tests__/',
      use: {
        ...devices['Desktop Safari'],
        launchOptions: {
          slowMo: 50,
        },
        userAgent: undefined,
        viewport,
      },
    },
  ],
  retries: IS_DEBUG ? 0 : IS_CI ? 4 : 1,
  testIgnore: /\/__tests__\/unit\//,
  timeout: 150000,
  use: {
    actionTimeout: 10000, // Max time to wait for actions
    navigationTimeout: 30000,
    // this causes issues in the CI on on current version.
    //trace: 'retain-on-failure',
    video: 'on-first-retry',
  },
  webServer: IS_CI
    ? {
        command: 'pnpm run start-test-server',
        port: 4000,
        reuseExistingServer: true,
        timeout: 120 * 1000,
      }
    : undefined,
  workers: 4,
};
export default config;
