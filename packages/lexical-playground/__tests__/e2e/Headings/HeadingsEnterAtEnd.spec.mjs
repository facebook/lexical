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
  test,
} from '../../utils/index.mjs';

test('Headings - changes to a paragraph when you press enter at the end of a heading', async ({
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

  await page.keyboard.press('Enter');

  await assertHTML(
    page,
    html`
      <h1
        class="PlaygroundEditorTheme__h1 PlaygroundEditorTheme__ltr"
        dir="ltr">
        <span data-lexical-text="true">Welcome to the playground</span>
      </h1>
      <p class="PlaygroundEditorTheme__paragraph"><br /></p>
    `,
  );
});
