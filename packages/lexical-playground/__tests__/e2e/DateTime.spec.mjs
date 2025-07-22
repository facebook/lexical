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
  selectFromInsertDropdown,
  test,
} from '../utils/index.mjs';

test.describe('DateTime', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));

  test('can insert a DateTime node via the Insert dropdown', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    // Insert DateTime using the Insert dropdown
    await selectFromInsertDropdown(page, '.item .calendar');

    // The DateTime node will render as a span with a class and the date text (today's date at midnight)
    // We'll match the output using a regex for the date string (YYYY-MM-DD or locale string)
    // For robustness, just check that a span with the DateTime class exists
    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span
            class="PlaygroundEditorTheme__dateTime"
            contenteditable="false"
            data-lexical-decorator="true">
            *
          </span>
        </p>
      `,
      undefined,
      {ignoreClasses: false, ignoreInlineStyles: true},
      // Custom modification: replace the date text with a wildcard for matching
      (actualHtml) =>
        actualHtml.replace(
          /(<span [^>]*PlaygroundEditorTheme__dateTime[^>]*>)(.*?)(<\/span>)/,
          '$1*$3',
        ),
    );
  });
});
