/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {expect, focusEditor, initialize, test} from '../utils/index.mjs';

test.describe('Focus', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));
  test(`can tab out of the editor`, async ({page, isRichText}) => {
    test.skip(isRichText);
    await focusEditor(page);
    await page.keyboard.press('Tab');
    const isEditorFocused = await page.evaluate(() => {
      const editor = document.querySelector('div[contenteditable="true"]');
      return editor === document.activeElement;
    });

    expect(isEditorFocused).toBe(false);
  });
});
