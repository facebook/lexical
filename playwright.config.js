/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';
const {devices} = require('@playwright/test');

const {CI} = process.env;
const IS_CI = CI === 'true';

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
      },
    },
  ],
  retries: IS_CI ? 4 : 1,
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
module.exports = config;
