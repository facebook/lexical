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
    // Delete the last empty paragraph
    await moveToEditorEnd(page);
    await page.keyboard.press('Backspace');

    // Enter some random text in the last cell.
    const randomText = Math.random().toString(36).substring(7);
    await page.keyboard.type(randomText);

    // Copy the table
    await page.keyboard.press('Meta+A');
    await page.keyboard.press('Meta+C');

    // Delete the table
    await page.keyboard.press('Backspace');
    expect(await page.locator('table').count()).toBe(0);

    // Paste the table
    await page.keyboard.press('Meta+V', {delay: 100});

    expect(await page.locator('table').count()).toBe(1);
    expect(await page.locator('td', {hasText: randomText}).count()).toBe(1);
  });
});
