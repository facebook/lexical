/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
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
          <span contenteditable="false" data-lexical-decorator="true"></span>
          <br />
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
          <span data-lexical-text="true">Sort by alphabetical order:</span>
        </p>
      `,
    );
  });

  test('Can autocomplete in the same format as the original text', async ({
    page,
    isPlainText,
  }) => {
    await focusEditor(page);
    await toggleBold(page);
    await toggleItalic(page);
    await toggleUnderline(page);
    await toggleStrikethrough(page);
    await increaseFontSize(page);

    await page.keyboard.type('MLH Fell');
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
            MLH Fell
          </strong>
          <strong
            class="PlaygroundEditorTheme__textUnderlineStrikethrough PlaygroundEditorTheme__textBold PlaygroundEditorTheme__textItalic PlaygroundEditorTheme__autocomplete"
            style="font-size: 17px;"
            data-lexical-text="true">
            owship (TAB)
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
            MLH Fell
          </strong>
        </p>
      `,
    );

    await page.keyboard.press('Tab');
    await page.keyboard.type(' is awesome!');

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
            MLH Fell
          </strong>
          <strong
            class="PlaygroundEditorTheme__textUnderlineStrikethrough PlaygroundEditorTheme__textBold PlaygroundEditorTheme__textItalic"
            style="font-size: 17px;"
            data-lexical-text="true">
            owship is awesome!
          </strong>
        </p>
      `,
    );
  });
});
