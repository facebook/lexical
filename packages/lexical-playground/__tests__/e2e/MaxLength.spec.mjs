/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  assertHTML,
  assertSelection,
  clearEditor,
  focusEditor,
  html,
  initialize,
  pasteFromClipboard,
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

    await assertSelection(page, {
      anchorOffset: 30,
      anchorPath: [0, 0, 0],
      focusOffset: 30,
      focusPath: [0, 0, 0],
    });

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

  test(`can restrict pasted text to specified length`, async ({page}) => {
    await focusEditor(page);
    await pasteFromClipboard(page, {
      'text/plain': 'lorem ipsum dolor sit amet, consectetuer adipiscing elit',
    });
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

  test(`can restrict emojis on boundaries`, async ({page}) => {
    await focusEditor(page);
    await pasteFromClipboard(page, {
      'text/plain': 'lorem ipsum dolor sit amet, consectetur adipiscing elit',
    });
    await page.keyboard.press('Backspace');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">lorem ipsum dolor sit amet, c</span>
        </p>
      `,
    );

    await page.keyboard.type('💏');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">lorem ipsum dolor sit amet, c</span>
        </p>
      `,
    );

    await page.keyboard.press('Backspace');
    await page.keyboard.type('💏');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">lorem ipsum dolor sit amet, 💏</span>
        </p>
      `,
    );

    await clearEditor(page);
    await page.keyboard.type('👨‍💻👨‍💻👨‍💻👨‍💻👨‍💻👨‍💻👨‍💻');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">👨‍💻👨‍💻👨‍💻👨‍💻👨‍💻👨‍💻</span>
        </p>
      `,
    );
  });
});
