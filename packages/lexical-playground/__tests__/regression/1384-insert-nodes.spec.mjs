/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {selectCharacters} from '../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  copyToClipboard,
  focusEditor,
  html,
  initialize,
  pasteFromClipboard,
  test,
  withExclusiveClipboardAccess,
} from '../utils/index.mjs';

test.describe('Regression test #1384', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));
  test(`Properly pastes in code blocks`, async ({
    page,
    isPlainText,
    isCollab,
  }) => {
    test.skip(isPlainText || isCollab);
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
    await withExclusiveClipboardAccess(async () => {
      const clipboard = await copyToClipboard(page);
      await page.keyboard.press('ArrowLeft');
      await pasteFromClipboard(page, clipboard);
    });
    await assertHTML(
      page,
      html`
        <code
          class="PlaygroundEditorTheme__code"
          dir="auto"
          spellcheck="false"
          data-gutter="123">
          <span data-lexical-text="true">alert(1)alert(1);</span>
          <br />
          <span data-lexical-text="true">alert(2);</span>
          <br />
          <span data-lexical-text="true">alert(3);</span>
        </code>
      `,
    );
  });
});
