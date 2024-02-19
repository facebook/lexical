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
  focusEditor,
  html,
  initialize,
  test,
} from '../../utils/index.mjs';

test('Headings - can transform to Headings when it has text', async ({
  page,
  isPlainText,
  isCollab,
}) => {
  test.skip(isPlainText);
  await initialize({isCollab, page});
  await focusEditor(page);

  await page.keyboard.type('Welcome to the playground');

  await assertHTML(
    page,
    html`
      <p
        class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
        dir="ltr">
        <span data-lexical-text="true">Welcome to the playground</span>
      </p>
    `,
  );

  await moveToEditorBeginning(page);

  for (const level of [1, 2, 3, 4, 5, 6, 1]) {
    await page.keyboard.type(`${'#'.repeat(level)} `);

    await assertHTML(
      page,
      html`
        <h${level}
          class="PlaygroundEditorTheme__h${level} PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Welcome to the playground</span>
        </h${level}>
      `,
    );
  }
});
