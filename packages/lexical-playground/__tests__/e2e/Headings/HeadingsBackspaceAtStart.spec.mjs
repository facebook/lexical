/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {moveToEditorBeginning} from '../../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  click,
  focusEditor,
  html,
  initialize,
  test,
} from '../../utils/index.mjs';

test('Headings - stays as a heading when you backspace at the start of a heading with no previous sibling nodes present', async ({
  page,
  isPlainText,
  isCollab,
}) => {
  test.skip(isPlainText);
  await initialize({isCollab, page});
  await focusEditor(page);

  await click(page, '.block-controls');
  await click(page, '.dropdown .icon.h1');

  await page.keyboard.type('Welcome to the playground');

  await assertHTML(
    page,
    html`
      <h1
        class="PlaygroundEditorTheme__h1 PlaygroundEditorTheme__ltr"
        dir="ltr">
        <span data-lexical-text="true">Welcome to the playground</span>
      </h1>
    `,
  );

  await moveToEditorBeginning(page);

  await page.keyboard.press('Backspace');

  await assertHTML(
    page,
    html`
      <h1
        class="PlaygroundEditorTheme__h1 PlaygroundEditorTheme__ltr"
        dir="ltr">
        <span data-lexical-text="true">Welcome to the playground</span>
      </h1>
    `,
  );
});

test('Headings - converts to paragraph when backspace at start of empty heading', async ({
  page,
  isPlainText,
  isCollab,
}) => {
  test.skip(isPlainText);
  await initialize({isCollab, page});
  await focusEditor(page);

  await click(page, '.block-controls');
  await click(page, '.dropdown .icon.h1');

  await assertHTML(
    page,
    html`
      <h1 class="PlaygroundEditorTheme__h1">
        <br />
      </h1>
    `,
  );

  await page.keyboard.press('Backspace');

  await assertHTML(
    page,
    html`
      <p class="PlaygroundEditorTheme__paragraph">
        <br />
      </p>
    `,
  );
});

test('Headings - does not create unnecessary history entries when backspace at start of heading with content', async ({
  page,
  isPlainText,
  isCollab,
}) => {
  // Note: This test works in regular collaborative mode but fails specifically in split view
  test.skip(isPlainText || isCollab);
  await initialize({isCollab, page});
  await focusEditor(page);

  // Create an empty heading
  await click(page, '.block-controls');
  await click(page, '.dropdown .icon.h1');

  // This is our meaningful change that should be undoable
  await page.keyboard.type('Welcome to the playground');

  await moveToEditorBeginning(page);

  // These backspace operations should not create history entries
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Backspace');

  // Verify content is unchanged after backspace attempts
  await assertHTML(
    page,
    html`
      <h1
        class="PlaygroundEditorTheme__h1 PlaygroundEditorTheme__ltr"
        dir="ltr">
        <span data-lexical-text="true">Welcome to the playground</span>
      </h1>
    `,
  );

  // Press undo - should undo the typing since backspace didn't create history entries
  await page.keyboard.press('Meta+z');

  // Should revert to empty heading since that was the state before typing
  await assertHTML(
    page,
    html`
      <h1 class="PlaygroundEditorTheme__h1">
        <br />
      </h1>
    `,
  );
});
