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
  waitForSelector,
} from '../utils/index.mjs';

test.describe('Special Text', () => {
  test.use({shouldAllowHighlightingWithBrackets: true});
  test.beforeEach(({isCollab, page, shouldAllowHighlightingWithBrackets}) =>
    initialize({
      isCollab,
      page,
      shouldAllowHighlightingWithBrackets,
    }),
  );
  test('should handle a single special text', async ({page}) => {
    await focusEditor(page);
    await page.keyboard.type('[MLH Fellowship]');
    await waitForSelector(page, '.PlaygroundEditorTheme__specialText');

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span
            class="PlaygroundEditorTheme__specialText"
            data-lexical-text="true">
            MLH Fellowship
          </span>
        </p>
      `,
    );
  });
  test('should handle multiple special texts', async ({page}) => {
    await focusEditor(page);
    await page.keyboard.type('[MLH Fellowship] [MLH Fellowship]');
    await waitForSelector(page, '.PlaygroundEditorTheme__specialText');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span
            class="PlaygroundEditorTheme__specialText"
            data-lexical-text="true">
            MLH Fellowship
          </span>
          <span data-lexical-text="true"></span>
          <span
            class="PlaygroundEditorTheme__specialText"
            data-lexical-text="true">
            MLH Fellowship
          </span>
        </p>
      `,
    );
  });
  test('should not work when the option to use brackets for highlighting is disabled', async ({
    page,
  }) => {
    await initialize({
      page,
      shouldAllowHighlightingWithBrackets: false,
    });
    await focusEditor(page);
    await page.keyboard.type('[MLH Fellowship]');
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">[MLH Fellowship]</span>
        </p>
      `,
    );
  });
});
