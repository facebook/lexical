/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {expect, Locator, Page, test} from '@playwright/test';

const outerEditor = (page: Page): Locator =>
  page
    .locator('.editor-container > .editor-inner > div[contenteditable="true"]')
    .first();

const innerEditor = (page: Page): Locator =>
  page.locator('.shadow-host div[contenteditable="true"]').first();

async function clearAndType(
  page: Page,
  locator: Locator,
  text: string,
): Promise<void> {
  await locator.click();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('Delete');
  await page.keyboard.type(text);
}

test('renders both editors with the inner one inside an open shadow root', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('.shadow-host')).toHaveCount(1);

  // The host has an open shadow root; the inner editor's contentEditable lives
  // inside it and is invisible to a light-DOM querySelector, while Playwright
  // (which pierces shadow roots) can see it.
  expect(
    await page.evaluate(
      () => document.querySelector('.shadow-host')!.shadowRoot !== null,
    ),
  ).toBe(true);
  // Outer editor's contentEditable is in the light DOM, so a light-DOM
  // querySelector finds exactly one.
  expect(
    await page.evaluate(
      () => document.querySelectorAll('div[contenteditable="true"]').length,
    ),
  ).toBe(1);
  await expect(outerEditor(page)).toBeVisible();
  await expect(innerEditor(page)).toBeVisible();
});

test('types and reconciles text in the inner shadow editor', async ({page}) => {
  await page.goto('/');
  await clearAndType(page, innerEditor(page), 'hello shadow world');
  await expect(innerEditor(page)).toHaveText('hello shadow world');
});

test('types and reconciles text in the outer light-DOM editor', async ({
  page,
}) => {
  await page.goto('/');
  await clearAndType(page, outerEditor(page), 'hello light world');
  await expect(outerEditor(page)).toContainText('hello light world');
});

test('formats an outer selection from the light-DOM toolbar', async ({
  page,
}) => {
  await page.goto('/');
  await clearAndType(page, outerEditor(page), 'hello world');

  // Select the trailing word ("world") and bold it via the toolbar. The
  // toolbar dispatches commands to the outer editor (its parent composer), so
  // the bold applies in the light-DOM tree.
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Shift+ArrowLeft');
  }
  await page.locator('.toolbar button[aria-label="Bold"]').click();

  await expect(outerEditor(page).locator('strong')).toHaveText('world');
});

test('deletes by word in the inner shadow editor', async ({page}) => {
  await page.goto('/');
  await clearAndType(page, innerEditor(page), 'hello world');
  // Backwards word deletion uses native Selection.modify, reading the result
  // via getComposedRanges inside the shadow root.
  await page.keyboard.press('ControlOrMeta+Backspace');
  await expect(innerEditor(page)).toHaveText('hello ');
});
