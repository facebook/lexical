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
  initialize,
  pasteFromClipboard,
  test,
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
    const clipboard = await copyToClipboard(page);
    await page.keyboard.press('ArrowLeft');
    await pasteFromClipboard(page, clipboard);
    await assertHTML(
      page,
      `<code class="PlaygroundEditorTheme__code PlaygroundEditorTheme__ltr" spellcheck="false" dir="ltr" data-gutter="123" data-highlight-language="javascript"><span class="PlaygroundEditorTheme__tokenFunction" data-lexical-text="true">alert</span><span class="PlaygroundEditorTheme__tokenPunctuation" data-lexical-text="true">(</span><span class="PlaygroundEditorTheme__tokenProperty" data-lexical-text="true">1</span><span class="PlaygroundEditorTheme__tokenPunctuation" data-lexical-text="true">)</span><span class="PlaygroundEditorTheme__tokenFunction" data-lexical-text="true">alert</span><span class="PlaygroundEditorTheme__tokenPunctuation" data-lexical-text="true">(</span><span class="PlaygroundEditorTheme__tokenProperty" data-lexical-text="true">1</span><span class="PlaygroundEditorTheme__tokenPunctuation" data-lexical-text="true">)</span><span class="PlaygroundEditorTheme__tokenPunctuation" data-lexical-text="true">;</span><br><span class="PlaygroundEditorTheme__tokenFunction" data-lexical-text="true">alert</span><span class="PlaygroundEditorTheme__tokenPunctuation" data-lexical-text="true">(</span><span class="PlaygroundEditorTheme__tokenProperty" data-lexical-text="true">2</span><span class="PlaygroundEditorTheme__tokenPunctuation" data-lexical-text="true">)</span><span class="PlaygroundEditorTheme__tokenPunctuation" data-lexical-text="true">;</span><br><span class="PlaygroundEditorTheme__tokenFunction" data-lexical-text="true">alert</span><span class="PlaygroundEditorTheme__tokenPunctuation" data-lexical-text="true">(</span><span class="PlaygroundEditorTheme__tokenProperty" data-lexical-text="true">3</span><span class="PlaygroundEditorTheme__tokenPunctuation" data-lexical-text="true">)</span><span class="PlaygroundEditorTheme__tokenPunctuation" data-lexical-text="true">;</span></code>`,
    );
  });
});
