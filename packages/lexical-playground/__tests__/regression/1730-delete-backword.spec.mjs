/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {deleteBackward, moveToLineEnd} from '../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  focusEditor,
  html,
  initialize,
  IS_MAC,
  test,
} from '../utils/index.mjs';

test.describe('Regression test #1730', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));
  test(`Can delete backward with keyboard`, async ({page}) => {
    if (!IS_MAC) {
      // Do Windows/Linux have equivalent shortcuts?
      return;
    }
    await focusEditor(page);

    await page.keyboard.type('hello world');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">hello world</span>
        </p>
      `,
    );

    await moveToLineEnd(page);
    await deleteBackward(page);
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">hello worl</span>
        </p>
      `,
    );
  });
});
