/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {undo} from '../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  focusEditor,
  html,
  initialize,
  test,
} from '../utils/index.mjs';

test.describe('Regression test #1055', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));
  test(`Adds new editor state into undo stack right after undo was done`, async ({
    isCollab,
    page,
  }) => {
    test.skip(isCollab);
    await focusEditor(page);
    await page.keyboard.type('hello');
    await undo(page);
    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
      `,
    );
    await page.keyboard.type('hello');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">hello</span>
        </p>
      `,
    );
    await undo(page);
    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
      `,
    );
  });
});
