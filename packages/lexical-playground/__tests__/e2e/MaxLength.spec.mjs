/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  assertHTML,
  focusEditor,
  html,
  initialize,
  test,
} from '../utils/index.mjs';

test.describe('MaxLength', () => {
  test.use({isMaxLength: true});
  test.beforeEach(({isCollab, isMaxLength, page}) =>
    initialize({isCollab, isMaxLength, page}),
  );
  test(`can restrict the text to specified length`, async ({page}) => {
    await focusEditor(page);

    await page.keyboard.type(
      'lorem ipsum dolor sit amet, consectetuer adipiscing elit',
    );

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">lorem ipsum dolor sit amet, co</span>
        </p>
      `,
    );

    await page.keyboard.press('ArrowRight');

    await page.keyboard.type('Some more text');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">lorem ipsum dolor sit amet, co</span>
        </p>
      `,
    );
  });
});
