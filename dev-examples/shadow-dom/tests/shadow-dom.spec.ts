/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {expect, Locator, Page, test} from '@playwright/test';

const editor = (page: Page): Locator =>
  page.locator('.shadow-host div[contenteditable="true"]').first();

async function clearAndType(page: Page, text: string): Promise<void> {
  await editor(page).click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Delete');
  await page.keyboard.type(text);
}

test('renders the React editor inside an open shadow root', async ({page}) => {
  await page.goto('/');
  await expect(page.locator('.shadow-host')).toHaveCount(1);

  // The host has an open shadow root; the contentEditable lives inside it, so
  // document.querySelector (which does not pierce shadow roots) cannot see it,
  // while Playwright (which does) can.
  expect(
    await page.evaluate(
      () => document.querySelector('.shadow-host')!.shadowRoot !== null,
    ),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => document.querySelector('div[contenteditable="true"]') !== null,
    ),
  ).toBe(false);
  await expect(editor(page)).toBeVisible();
});

test('types and reconciles text inside the shadow root', async ({page}) => {
  await page.goto('/');
  await clearAndType(page, 'hello shadow world');
  await expect(editor(page)).toHaveText('hello shadow world');
});

test('formats a shadow-DOM selection from the light-DOM toolbar', async ({
  page,
}) => {
  await page.goto('/');
  await clearAndType(page, 'hello world');

  // Select the trailing word ("world") and bold it via the toolbar, which
  // lives in the light DOM outside the shadow root — the command operates on
  // the selection inside the shadow tree.
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Shift+ArrowLeft');
  }
  await page.locator('.toolbar button[aria-label="Bold"]').click();

  await expect(editor(page).locator('strong')).toHaveText('world');
});

test('deletes by word inside the shadow root', async ({page}) => {
  await page.goto('/');
  await clearAndType(page, 'hello world');
  // Backwards word deletion uses native Selection.modify, reading the result
  // via getComposedRanges inside the shadow root.
  await page.keyboard.press('ControlOrMeta+Backspace');
  await expect(editor(page)).toHaveText('hello ');
});
