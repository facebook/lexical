/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  assertFocus,
  assertHTML,
  click,
  focusEditor,
  hasFocus,
  html,
  initialize,
  repeat,
  test,
} from '../utils/index.mjs';

test.describe('Placeholder', () => {
  test.beforeEach(({isCollab, page}) =>
    initialize({isCollab, page, testSkipSelection: true}),
  );
  test(`Shows foo 10 times, editor is not focused`, async ({
    page,
    isRichText,
    isCollab,
  }) => {
    await focusEditor(page);

    await repeat(10, async () => await click(page, '.skip-selection-button'));
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">${'foo'.repeat(10)}</span>
        </p>
      `,
    );
    await assertFocus(page, false);

    // For some reason, the browser moves the selection to the beginning when calling editor.focus()
    let focused = false;
    while (!focused) {
      await page.keyboard.press('Tab');
      focused = await hasFocus(page);
    }

    await page.keyboard.type('bar');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">${'foo'.repeat(10)}bar</span>
        </p>
      `,
    );
  });
});
