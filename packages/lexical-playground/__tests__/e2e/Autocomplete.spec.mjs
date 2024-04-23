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
          <span contenteditable="false" data-lexical-decorator="true">
            <span
              class="PlaygroundEditorTheme__autocomplete"
              spellcheck="false">
              betical (TAB)
            </span>
          </span>
          <br />
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
});
