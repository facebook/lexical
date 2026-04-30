/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  moveRight,
  moveToEditorBeginning,
  selectCharacters,
} from '../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  evaluate,
  focusEditor,
  html,
  initialize,
  test,
} from '../utils/index.mjs';

/**
 * Dispatch HTML5 dragstart/drop events directly on the root element. Playwright's
 * mouse API does not trigger native drag events, so we synthesize them.
 */
async function dragSelectionToOffset(page, sourceText, clientTextOffset) {
  return evaluate(
    page,
    ({text, offset}) => {
      const editable = document.querySelector('[contenteditable="true"]');
      if (!editable) {
        throw new Error('editor not found');
      }
      const paragraph = editable.querySelector('p');
      const span = paragraph.querySelector('span');
      const domText = span.firstChild;
      const range = document.createRange();
      range.setStart(domText, offset);
      range.setEnd(domText, offset);
      const rect = range.getBoundingClientRect();
      const clientX = rect.left;
      const clientY = rect.top + rect.height / 2;

      const dataTransfer = new DataTransfer();
      dataTransfer.setData('text/plain', text);
      dataTransfer.setData('text/html', text);

      editable.dispatchEvent(
        new DragEvent('dragstart', {
          bubbles: true,
          cancelable: true,
          dataTransfer,
        }),
      );
      editable.dispatchEvent(
        new DragEvent('drop', {
          bubbles: true,
          cancelable: true,
          clientX,
          clientY,
          dataTransfer,
        }),
      );
      editable.dispatchEvent(
        new DragEvent('dragend', {
          bubbles: true,
          cancelable: true,
          dataTransfer,
        }),
      );
    },
    {offset: clientTextOffset, text: sourceText},
  );
}

test.describe('Text drag and drop', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));

  test('moves a selected word forward within the same block (rich text)', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.type('abcFOOdef');

    // Select "FOO" (characters 3-6).
    await moveToEditorBeginning(page);
    await moveRight(page, 6);
    await selectCharacters(page, 'left', 3);

    // Drop at offset 9 (end of the text).
    await dragSelectionToOffset(page, 'FOO', 9);

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph" dir="auto">
          <span data-lexical-text="true">abcdefFOO</span>
        </p>
      `,
    );
  });

  test('moves a selected word backward within the same block (rich text)', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.type('abcFOOdef');

    await moveToEditorBeginning(page);
    await moveRight(page, 6);
    await selectCharacters(page, 'left', 3);

    // Drop at offset 0 (beginning of the text).
    await dragSelectionToOffset(page, 'FOO', 0);

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph" dir="auto">
          <span data-lexical-text="true">FOOabcdef</span>
        </p>
      `,
    );
  });

  test('dropping inside the source range is a no-op (rich text)', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.type('abcFOOdef');

    await moveToEditorBeginning(page);
    await moveRight(page, 6);
    await selectCharacters(page, 'left', 3);

    // Drop inside the "FOO" selection (offset 4 lands between F and O).
    await dragSelectionToOffset(page, 'FOO', 4);

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph" dir="auto">
          <span data-lexical-text="true">abcFOOdef</span>
        </p>
      `,
    );
  });

  test('moves a selected word forward within the same block (plain text)', async ({
    page,
    isPlainText,
  }) => {
    test.skip(!isPlainText);
    await focusEditor(page);
    await page.keyboard.type('abcFOOdef');

    await moveToEditorBeginning(page);
    await moveRight(page, 6);
    await selectCharacters(page, 'left', 3);

    await dragSelectionToOffset(page, 'FOO', 9);

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph" dir="auto">
          <span data-lexical-text="true">abcdefFOO</span>
        </p>
      `,
    );
  });
});
