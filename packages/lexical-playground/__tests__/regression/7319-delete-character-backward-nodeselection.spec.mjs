/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {deleteBackward, moveLeft} from '../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  focusEditor,
  html,
  initialize,
  pasteFromClipboard,
  test,
} from '../utils/index.mjs';

test.describe('Regression tests for #7319', () => {
  test.beforeEach(({isPlainText, isCollab, page}) =>
    initialize({isCollab, isPlainText, page}),
  );

  test(`deleteCharacter after hr with RangeSelection`, async ({
    page,
    isCollab,
    isPlainText,
  }) => {
    test.skip(isCollab || isPlainText);
    await focusEditor(page);
    await page.keyboard.press('Enter');
    const hrCount = 3;
    for (let i = 0; i < hrCount; i++) {
      await pasteFromClipboard(page, {
        'text/html': html`
          <hr />
        `,
      });
    }
    async function assertHR(count) {
      const expectedHtml = html`
        <p><br /></p>
        ${Array.from(
          {length: count},
          () => '<hr contenteditable="false" data-lexical-decorator="true" />',
        ).join('')}
        ${count > 0
          ? '<div contenteditable="false" data-lexical-cursor="true"></div>'
          : ''}
      `;
      await assertHTML(page, expectedHtml, expectedHtml, {
        ignoreClasses: true,
        ignoreInlineStyles: true,
      });
    }
    for (let i = hrCount; i > 0; i--) {
      await assertHR(i);
      await deleteBackward(page);
    }
    await assertHR(0);
  });
  test(`deleteCharacter after hr with NodeSelection`, async ({
    page,
    isCollab,
    isPlainText,
  }) => {
    test.skip(isCollab || isPlainText);
    await focusEditor(page);
    await page.keyboard.press('Enter');
    const hrCount = 3;
    for (let i = 0; i < hrCount; i++) {
      await pasteFromClipboard(page, {
        'text/html': html`
          <hr />
        `,
      });
    }
    async function assertHR(count) {
      const expectedHtml = html`
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
        ${Array.from(
          {length: count},
          (_, i) =>
            `<hr class="PlaygroundEditorTheme__hr ${
              i === hrCount - 1 ? 'PlaygroundEditorTheme__hrSelected' : ''
            }" contenteditable="false" data-lexical-decorator="true" />`,
        ).join('')}
        ${count > 0 && count < hrCount
          ? '<div class="PlaygroundEditorTheme__blockCursor" contenteditable="false" data-lexical-cursor="true"></div>'
          : ''}
      `;
      await assertHTML(page, expectedHtml);
    }
    await moveLeft(page, 1);
    for (let i = hrCount; i > 0; i--) {
      await assertHR(i);
      await deleteBackward(page);
    }
    await assertHR(0);
  });
});
