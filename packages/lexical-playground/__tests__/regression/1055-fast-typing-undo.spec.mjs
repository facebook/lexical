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
    // Wait for the typed text to settle before undoing. On WebKit the input
    // events dispatched by keyboard.type() can be applied after the call
    // resolves; without this barrier the undo below races ahead of the typing
    // and the still-queued input then re-applies the text, so the editor is
    // not empty when we assert (flaky on the mac-plain/webkit suite).
    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph" dir="auto">
          <span data-lexical-text="true">hello</span>
        </p>
      `,
    );
    await undo(page);
    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph" dir="auto">
          <br data-lexical-managed-linebreak="true" />
        </p>
      `,
    );
    await page.keyboard.type('hello');
    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph" dir="auto">
          <span data-lexical-text="true">hello</span>
        </p>
      `,
    );
    await undo(page);
    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph" dir="auto">
          <br data-lexical-managed-linebreak="true" />
        </p>
      `,
    );
  });
});
