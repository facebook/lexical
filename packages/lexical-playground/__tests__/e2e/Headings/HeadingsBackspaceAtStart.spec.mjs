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
