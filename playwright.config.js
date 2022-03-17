'use strict';
const {devices} = require('@playwright/test');

const config = {
  projects: [
    {
      name: 'chromium',
      testDir: './packages/lexical-playground/__tests__/e2e/',
      use: {...devices['Desktop Chrome']},
    },
    {
      name: 'firefox',
      testDir: './packages/lexical-playground/__tests__/e2e/',
      use: {...devices['Desktop Firefox']},
    },
    {
      name: 'webkit',
      testDir: './packages/lexical-playground/__tests__/e2e/',
      use: {...devices['Desktop Safari']},
    },
  ],
  retries: 3,
};
module.exports = config;
