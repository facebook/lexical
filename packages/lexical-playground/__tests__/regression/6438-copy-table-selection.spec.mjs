/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  moveToEditorBeginning,
  moveToEditorEnd,
} from '../keyboardShortcuts/index.mjs';
import {
  expect,
  focusEditor,
  getEditorElement,
  initialize,
  insertTable,
  test,
} from '../utils/index.mjs';

test.describe('Regression test #6438', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));
  test(`Table can be copied when the table is only node`, async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);

    await insertTable(page, 5, 5);

    // Ensure no elements are present except the table.
    // Delete the first empty paragraph
    await moveToEditorBeginning(page);
    await page.keyboard.press('Backspace');
    expect(await getEditorElement(page).locator(':scope > p').count()).toBe(1);
    // Delete the last empty paragraph
    await moveToEditorEnd(page);
    await page.keyboard.press('Backspace');
    expect(await getEditorElement(page).locator(':scope > p').count()).toBe(0);

    // Enter some random text in the last cell.
    const randomText = Math.random().toString(36).substring(7);
    await page.keyboard.type(randomText);

    // Copy the table
    await page.keyboard.press('Meta+A', {delay: 50});
    await page.keyboard.press('Meta+C', {delay: 50});

    // Delete the table
    await page.keyboard.press('Backspace', {delay: 50});
    expect(await page.locator('table').count()).toBe(0);

    // Paste the table
    await page.keyboard.press('Meta+V');

    expect(await page.locator('table').count()).toBe(1);
    expect(await page.locator('td', {hasText: randomText}).count()).toBe(1);
  });
});
