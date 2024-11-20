/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  decreaseFontSize,
  increaseFontSize,
  toggleBold,
  toggleItalic,
  toggleStrikethrough,
  toggleUnderline,
} from '../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  focusEditor,
  html,
  initialize,
  sleep,
  test,
} from '../utils/index.mjs';

test.describe('Autocomplete', () => {
  test.beforeEach(({isCollab, page}) =>
    initialize({isAutocomplete: true, isCollab, page}),
  );
  test('Can autocomplete a word', async ({page, isPlainText}) => {
    await focusEditor(page);
    await page.keyboard.type('Sort by alpha');
    await sleep(500);
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Sort by alpha</span>
          <span
            class="PlaygroundEditorTheme__autocomplete"
            style="font-size: 15px"
            data-lexical-text="true">
            betical (TAB)
          </span>
        </p>
      `,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Sort by alpha</span>
          <span data-lexical-text="true"></span>
        </p>
      `,
    );
    await page.keyboard.press('Tab');
    await page.keyboard.type(' order:');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">Sort by alpha</span>
          <span style="font-size: 15px" data-lexical-text="true">
            betical order:
          </span>
        </p>
      `,
    );
  });

  test('Can autocomplete in the same format as the original text', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await toggleBold(page);
    await toggleItalic(page);
    await toggleUnderline(page);
    await toggleStrikethrough(page);
    await increaseFontSize(page);

    await page.keyboard.type('Test');
    await sleep(500);

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <strong
            class="PlaygroundEditorTheme__textUnderlineStrikethrough PlaygroundEditorTheme__textBold PlaygroundEditorTheme__textItalic"
            style="font-size: 17px;"
            data-lexical-text="true">
            Test
          </strong>
          <strong
            class="PlaygroundEditorTheme__textUnderlineStrikethrough PlaygroundEditorTheme__textBold PlaygroundEditorTheme__textItalic PlaygroundEditorTheme__autocomplete"
            style="font-size: 17px;"
            data-lexical-text="true">
            imonials (TAB)
          </strong>
        </p>
      `,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <strong
            class="PlaygroundEditorTheme__textUnderlineStrikethrough PlaygroundEditorTheme__textBold PlaygroundEditorTheme__textItalic"
            style="font-size: 17px;"
            data-lexical-text="true">
            Test
          </strong>
          <span data-lexical-text="true"></span>
        </p>
      `,
    );

    await page.keyboard.press('Tab');

    await toggleBold(page);
    await toggleItalic(page);
    await toggleUnderline(page);
    await toggleStrikethrough(page);
    await decreaseFontSize(page);

    await page.keyboard.type(' 2024');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <strong
            class="PlaygroundEditorTheme__textUnderlineStrikethrough PlaygroundEditorTheme__textBold PlaygroundEditorTheme__textItalic"
            style="font-size: 17px;"
            data-lexical-text="true">
            Test
          </strong>
          <strong
            class="PlaygroundEditorTheme__textUnderlineStrikethrough PlaygroundEditorTheme__textBold PlaygroundEditorTheme__textItalic"
            style="font-size: 17px;"
            data-lexical-text="true">
            imonials
          </strong>
          <span style="font-size: 15px;" data-lexical-text="true">2024</span>
        </p>
      `,
    );
  });
});
