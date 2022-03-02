/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  initializeE2E,
  assertHTML,
  assertSelection,
  focusEditor,
  waitForSelector,
  copyToClipboard,
  pasteFromClipboard,
} from '../utils';

import {selectCharacters} from '../keyboardShortcuts';

describe('Regression test #1384', () => {
  initializeE2E((e2e) => {
    it.skipIf(e2e.isPlainText, `Properly pastes in code blocks`, async () => {
      const {page} = e2e;
      await focusEditor(page);
      await page.keyboard.type('``` alert(1);');
      await page.keyboard.press('Enter');
      await page.keyboard.type('alert(2);');
      await page.keyboard.press('Enter');
      await page.keyboard.type('alert(3);');
      await page.keyboard.press('ArrowUp');
      await page.keyboard.press('ArrowUp');
      await selectCharacters(page, 'left', 9);
      const clipboard = await copyToClipboard(page);
      page.keyboard.press('ArrowRight');
      await pasteFromClipboard(page, clipboard);
      await expect(page).toMatchEditorInlineSnapshot(`
        <code spellcheck="false" dir="ltr">
          <span data-lexical-text="true">alert</span>
          <span data-lexical-text="true">(</span>
          <span data-lexical-text="true">1</span>
          <span data-lexical-text="true">)</span>
          <span data-lexical-text="true">;</span>
          <span data-lexical-text="true">alert</span>
          <span data-lexical-text="true">(</span>
          <span data-lexical-text="true">1</span>
          <span data-lexical-text="true">)</span>
          <span data-lexical-text="true">;</span>
          <br />
          <span data-lexical-text="true">alert</span>
          <span data-lexical-text="true">(</span>
          <span data-lexical-text="true">2</span>
          <span data-lexical-text="true">)</span>
          <span data-lexical-text="true">;</span>
          <br />
          <span data-lexical-text="true">alert</span>
          <span data-lexical-text="true">(</span>
          <span data-lexical-text="true">3</span>
          <span data-lexical-text="true">)</span>
          <span data-lexical-text="true">;</span>
        </code>
    `);
    });
  });
});
