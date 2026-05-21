import {defineConfig, devices} from '@playwright/test';
import {GLOBALTIMEOUT, TIMEOUT} from './test/constants';

/**
 * See https://playwright.dev/docs/test-configuration.
 */

export default defineConfig({
  timeout: TIMEOUT,
  globalTimeout: GLOBALTIMEOUT,

  testDir: './test',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // So the two tests run after each other
  reporter: 'html',
  use: {
    headless: true,
    actionTimeout: 2 * 60 * 1000,
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: {...devices['Desktop Chrome']},
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'pnpm run dev',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
  },
});
