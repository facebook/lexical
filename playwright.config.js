'use strict';
const {devices} = require('@playwright/test');

const config = {
  forbidOnly: !!process.env.CI,
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
  timeout: 60000,
  retries: process.env.IS_CI ? 5 : 1,
  use: {
    // this causes issues in the CI on on current version.
    //trace: 'retain-on-failure',
    video: 'on-first-retry',
  },
};
module.exports = config;
