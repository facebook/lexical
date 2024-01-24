/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  assertHTML,
  focusEditor,
  html,
  initialize,
  test,
} from '../utils/index.mjs';

test.describe('Tab', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));
  test(`can tab + IME`, async ({page, isPlainText, browserName}) => {
    test.skip(isPlainText || browserName === 'firefox');

    async function imeType() {
      await page.keyboard.imeSetComposition('ｓ', 1, 1);
      await page.keyboard.imeSetComposition('す', 1, 1);
      await page.keyboard.imeSetComposition('すｓ', 2, 2);
      await page.keyboard.imeSetComposition('すｓｈ', 3, 3);
      await page.keyboard.imeSetComposition('すし', 2, 2);
      await page.keyboard.insertText('すし');
      await page.keyboard.type(' ');
    }
    await focusEditor(page);
    // Indent
    await page.keyboard.press('Tab');
    await imeType();
    await page.keyboard.press('Tab');
    await imeType();

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__indent PlaygroundEditorTheme__ltr"
          dir="ltr"
          style="padding-inline-start: calc(40px)">
          <span data-lexical-text="true">すし</span>
          <span data-lexical-text="true"></span>
          <span data-lexical-text="true">すし</span>
        </p>
      `,
    );
  });

  test('can tab inside code block #4399', async ({page, isPlainText}) => {
    test.skip(isPlainText);
    await focusEditor(page);

    await page.keyboard.type('``` ');
    await page.keyboard.press('Tab');
    await page.keyboard.type('function');
    await assertHTML(
      page,
      html`
        <code
          class="PlaygroundEditorTheme__code PlaygroundEditorTheme__ltr"
          dir="ltr"
          spellcheck="false"
          data-gutter="1"
          data-highlight-language="javascript">
          <span data-lexical-text="true"></span>
          <span
            class="PlaygroundEditorTheme__tokenAttr"
            data-lexical-text="true">
            function
          </span>
        </code>
      `,
    );
  });
});
