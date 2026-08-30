/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  deleteNextWord,
  selectAll,
  toggleBulletList,
} from '../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  focusEditor,
  html,
  initialize,
  test,
} from '../utils/index.mjs';

const EMPTY_EDITOR = html`
  <p class="PlaygroundEditorTheme__paragraph" dir="auto">
    <br data-lexical-managed-linebreak="true" />
  </p>
`;

// Selecting the whole document and wiping it should leave the editor exactly as
// it starts out: one empty paragraph. When the surviving block was a heading,
// quote or list it used to linger as an empty block of that type, so the next
// thing typed came out as a heading or a bullet (#5835).
test.describe('Select all + delete clears the editor (#5835)', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));

  test('a heading, with Backspace', async ({page, isPlainText}) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.type('# Just a heading');
    await selectAll(page);
    await page.keyboard.press('Backspace');
    await assertHTML(page, EMPTY_EDITOR);
  });

  test('a heading, with forward Delete', async ({page, isPlainText}) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.type('# Just a heading');
    await selectAll(page);
    await page.keyboard.press('Delete');
    await assertHTML(page, EMPTY_EDITOR);
  });

  test('a quote, with forward Delete', async ({page, isPlainText}) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.type('> Just a quote');
    await selectAll(page);
    await page.keyboard.press('Delete');
    await assertHTML(page, EMPTY_EDITOR);
  });

  test('a list followed by a paragraph, with Backspace', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await toggleBulletList(page);
    await page.keyboard.type('one');
    await page.keyboard.press('Enter');
    await page.keyboard.type('two');
    await selectAll(page);
    await page.keyboard.press('Backspace');
    await assertHTML(page, EMPTY_EDITOR);
  });

  test('a heading, with delete-by-word', async ({page, isPlainText}) => {
    test.skip(isPlainText);
    await focusEditor(page);
    await page.keyboard.type('# Just a heading');
    await selectAll(page);
    await deleteNextWord(page);
    await assertHTML(page, EMPTY_EDITOR);
  });
});
