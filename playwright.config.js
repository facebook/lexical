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
      use: {...devices['Desktop Chrome']},
    },
    {
      name: 'firefox',
      testDir: './packages/lexical-playground/__tests__/',
      use: {...devices['Desktop Firefox']},
    },
    {
      name: 'webkit',
      testDir: './packages/lexical-playground/__tests__/',
      use: {...devices['Desktop Safari']},
    },
  ],
  retries: IS_CI ? 4 : 1,
  timeout: 150000,
  use: {
    navigationTimeout: 30000,
    // this causes issues in the CI on on current version.
    //trace: 'retain-on-failure',
    video: 'on-first-retry',
  },
};
module.exports = config;
