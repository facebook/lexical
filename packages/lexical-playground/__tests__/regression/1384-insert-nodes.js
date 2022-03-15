/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {selectCharacters} from '../keyboardShortcuts';
import {
  copyToClipboard,
  focusEditor,
  initializeE2E,
  pasteFromClipboard,
} from '../utils';

describe('Regression test #1384', () => {
  initializeE2E((e2e) => {
    it.skipIf(
      e2e.isPlainText || e2e.isCollab,
      `Properly pastes in code blocks`,
      async () => {
        const {page} = e2e;
        await focusEditor(page);
        await page.keyboard.type('``` alert(1);');
        await page.keyboard.press('Enter');
        await page.keyboard.type('alert(2);');
        await page.keyboard.press('Enter');
        await page.keyboard.type('alert(3);');
        await page.keyboard.press('ArrowUp');
        await page.keyboard.press('ArrowUp');
        await page.keyboard.press('ArrowLeft');
        await selectCharacters(page, 'left', 8);
        const clipboard = await copyToClipboard(page);
        await page.keyboard.press('ArrowLeft');
        await pasteFromClipboard(page, clipboard);
        await expect(page).toMatchEditorInlineSnapshot(`
              <code spellcheck="false" dir="ltr">
                <span data-lexical-text="true">alert</span>
                <span data-lexical-text="true">(</span>
                <span data-lexical-text="true">1</span>
                <span data-lexical-text="true">)</span>
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
      },
    );
  });
});
