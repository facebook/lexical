/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {chromium, firefox, webkit} from 'playwright';

const E2E_DEBUG = process.env.E2E_DEBUG;
const E2E_PORT = process.env.E2E_PORT || 3000;

function uppercase(str) {
  return str[0].toUpperCase() + str.slice(1);
}

export function initializeE2E(browsers, runTests) {
  Object.keys(browsers).forEach((browser) => {
    describe(uppercase(browser), () => {
      const e2e = {
        browser: null,
        page: null,
      };

      beforeAll(async () => {
        e2e.browser = await {chromium, webkit, firefox}[browser].launch({headless: !E2E_DEBUG});
      });
      beforeEach(async () => {
        const page = await e2e.browser.newPage();
        await page.goto(`http://localhost:${E2E_PORT}/`);
        e2e.page = page;
      });
      afterEach(async () => {
        if (!E2E_DEBUG) {
          await e2e.page.close();
        }
      });
      afterAll(async () => {
        if (!E2E_DEBUG) {
          await e2e.browser.close();
        }
      });
      
      runTests(e2e);
    })
  })
}

export async function repeat(times, cb) {
  for (let i = 0; i < times; i++) {
    await cb();
  }
}

export async function assertHtmlSnapshot(page) {
  const html = await page.innerHTML('div.editor');
  expect(html).toMatchSnapshot();
}
