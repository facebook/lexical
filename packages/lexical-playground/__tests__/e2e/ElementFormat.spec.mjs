/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  assertHTML,
  click,
  focusEditor,
  html,
  initialize,
  repeat,
  test,
  waitForSelector,
} from '../utils/index.mjs';

test.describe('Element format', () => {
  test.beforeEach(({isCollab, isPlainText, page}) => {
    test.skip(isPlainText);
    initialize({isCollab, page});
  });

  test('can indent/align paragraph when caret is within link', async ({
    page,
    isPlainText,
  }) => {
    await focusEditor(page);
    await page.keyboard.type('Hello https://lexical.io world');
    await repeat(10, async () => {
      await page.keyboard.press('ArrowLeft');
    });
    await waitForSelector(page, '.format.indent');
    await click(page, '.format.indent');
    await click(page, '.format.indent');
    await waitForSelector(page, '.format.center-align');
    await click(page, '.format.center-align');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          style="padding-inline-start: 80px; text-align: center;"
          dir="ltr"
        >
          <span data-lexical-text="true">Hello</span>
          <a
            href="https://lexical.io"
            class="PlaygroundEditorTheme__link PlaygroundEditorTheme__ltr"
            dir="ltr"
          >
            <span data-lexical-text="true">https://lexical.io</span>
          </a>
          <span data-lexical-text="true">world</span>
        </p>
      `,
      {
        ignoreClasses: false,
        ignoreInlineStyles: false,
      },
    );
  });
});
