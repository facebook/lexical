/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  moveRight,
  moveToEditorBeginning,
} from '../../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  click,
  focusEditor,
  html,
  initialize,
  test,
} from '../../utils/index.mjs';

test(`Headings - stays as a heading when you press enter in the middle of a heading`, async ({
  page,
  isCollab,
  isPlainText,
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

  await moveRight(page, 5);

  await page.keyboard.press('Enter');

  await assertHTML(
    page,
    html`
      <h1
        class="PlaygroundEditorTheme__h1 PlaygroundEditorTheme__ltr"
        dir="ltr">
        <span data-lexical-text="true">Welco</span>
      </h1>
      <h1
        class="PlaygroundEditorTheme__h1 PlaygroundEditorTheme__ltr"
        dir="ltr">
        <span data-lexical-text="true">me to the playground</span>
      </h1>
    `,
  );
});
