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

/* eslint-disable sort-keys-fix/sort-keys-fix */
test.describe('Tab', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));
  test(`can tab + IME`, async ({page, isPlainText, browserName}) => {
    // CDP session is only available in Chromium
    test.skip(
      isPlainText || browserName === 'firefox' || browserName === 'webkit',
    );

    const client = await page.context().newCDPSession(page);
    async function imeType() {
      // await page.keyboard.imeSetComposition('ｓ', 1, 1);
      await client.send('Input.imeSetComposition', {
        selectionStart: 1,
        selectionEnd: 1,
        text: 'ｓ',
      });
      // await page.keyboard.imeSetComposition('す', 1, 1);
      await client.send('Input.imeSetComposition', {
        selectionStart: 1,
        selectionEnd: 1,
        text: 'す',
      });
      // await page.keyboard.imeSetComposition('すｓ', 2, 2);
      await client.send('Input.imeSetComposition', {
        selectionStart: 2,
        selectionEnd: 2,
        text: 'すｓ',
      });
      // await page.keyboard.imeSetComposition('すｓｈ', 3, 3);
      await client.send('Input.imeSetComposition', {
        selectionStart: 3,
        selectionEnd: 3,
        text: 'すｓｈ',
      });
      // await page.keyboard.imeSetComposition('すし', 2, 2);
      await client.send('Input.imeSetComposition', {
        selectionStart: 2,
        selectionEnd: 2,
        text: 'すし',
      });
      // await page.keyboard.insertText('すし');
      await client.send('Input.insertText', {
        text: 'すし',
      });
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
          data-highlight-language="javascript"
          data-language="javascript">
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
/* eslint-enable sort-keys-fix/sort-keys-fix */
