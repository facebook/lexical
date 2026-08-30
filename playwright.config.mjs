/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {defineConfig, devices} from '@playwright/test';

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

/**
 *
 * @param {string} name
 * @param {keyof typeof devices} deviceName
 * @returns
 */
function project(name, deviceName) {
  return {
    name,
    testDir: './packages/lexical-playground/__tests__/',
    use: {
      ...devices[deviceName],
      launchOptions: {
        slowMo: 50,
      },
      userAgent: undefined,
      viewport,
    },
  };
}

const config = defineConfig({
  forbidOnly: IS_CI,
  fullyParallel: !IS_DEBUG,
  projects: [
    project('chromium', 'Dekstop Chrome'),
    project('firefox', 'Desktop Firefox'),
    project('webkit', 'Desktop Safari'),
  ],
  retries: IS_DEBUG ? 0 : IS_CI ? 2 : 1,
  testIgnore: /\/__tests__\/unit\//,
  timeout: 150000,
  use: {
    actionTimeout: 10000, // Max time to wait for actions
    navigationTimeout: 30000,
    // this causes issues in the CI on current version.
    //trace: 'retain-on-failure',
    video: 'on-first-retry',
  },
  webServer: IS_CI
    ? {
        command: 'pnpm run start-test-server',
        reuseExistingServer: false,
        timeout: 120 * 1000,
        url: 'http://localhost:4000',
      }
    : undefined,
  workers: IS_DEBUG ? 1 : IS_CI ? 4 : undefined,
});
export default config;
