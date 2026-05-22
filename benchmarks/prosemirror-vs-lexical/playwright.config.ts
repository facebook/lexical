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

  /* Run the production server before starting the tests. Run
   * `pnpm exec next build` once before invoking playwright — building
   * inside webServer.command risks exceeding the startup timeout, and
   * the prod bundle is what we actually want measured. Setting
   * `BENCH_DEV=1` falls back to `next dev` for quick iteration. */
  webServer: {
    command: process.env.BENCH_DEV === '1' ? 'pnpm run dev' : 'pnpm run start',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
