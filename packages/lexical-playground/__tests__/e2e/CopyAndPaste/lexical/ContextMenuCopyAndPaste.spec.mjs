/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {selectAll} from '../../../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  click,
  doubleClick,
  focusEditor,
  html,
  initialize,
  pasteFromClipboard,
  test,
} from '../../../utils/index.mjs';

test.describe('ContextMenuCopyAndPaste', () => {
  test.use({shouldUseLexicalContextMenu: true});
  test.beforeEach(({isCollab, page, shouldUseLexicalContextMenu}) =>
    initialize({isCollab, page, shouldUseLexicalContextMenu}),
  );

  test('Basic copy-paste #6231', async ({page, isPlainText}) => {
    test.skip(isPlainText);
    await focusEditor(page);

    await page.keyboard.type('hello');
    await click(page, '.lock');

    await page.pause();
    await doubleClick(page, 'div[contenteditable="false"] span');
    await page.pause();
    await click(page, 'div[contenteditable="false"] span', {button: 'right'});
    await click(page, '#typeahead-menu [role="option"] :text("Copy")');

    await click(page, '.unlock');
    await focusEditor(page);

    await pasteFromClipboard(page);

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span data-lexical-text="true">hellohello</span>
        </p>
      `,
    );
  });
  test('Rich text Copy and Paste #6780', async ({page, isPlainText}) => {
    test.skip(isPlainText);
    await page
      .context()
      .grantPermissions(['clipboard-read', 'clipboard-write']);
    await click(page, '.font-increment');
    await click(page, '.font-color');
    await click(
      page,
      '.color-picker-basic-color button[style="background-color: rgb(208, 2, 27);"]',
    );
    await focusEditor(page);
    await page.keyboard.type('MLH Fellowship');
    await focusEditor(page);
    await click(
      page,
      '.color-picker-basic-color button[style="background-color: rgb(0, 0, 0);"]',
    );
    await click(page, '.font-color');
    await focusEditor(page);
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Fall 2024');
    await page.keyboard.press('Enter');
    await click(page, '.font-decrement');
    await page.keyboard.type('---');

    await selectAll(page);
    await click(page, '.lock');

    await doubleClick(page, 'div[contenteditable="false"] span');
    await click(page, 'div[contenteditable="false"] span', {button: 'right'});
    await click(page, '#typeahead-menu [role="option"] :text("Copy")');

    await click(page, '.unlock');
    await focusEditor(page);

    await click(page, 'div[contenteditable="true"] > p:last-of-type', {
      button: 'right',
    });
    await click(page, '#typeahead-menu [role="option"] :text("Paste")');
    await page.pause();

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span
            style="font-size: 17px; color: rgb(208, 2, 27)"
            data-lexical-text="true">
            MLH Fellowship
          </span>
        </p>
        <p class="PlaygroundEditorTheme__paragraph">
          <br />
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span
            style="font-size: 17px; color: rgb(0, 0, 0)"
            data-lexical-text="true">
            Fall 2024
          </span>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span
            style="font-size: 15px; color: rgb(0, 0, 0)"
            data-lexical-text="true">
            ---
          </span>
          <span
            style="font-size: 17px; color: rgb(208, 2, 27)"
            data-lexical-text="true">
            Fellowship
          </span>
        </p>
      `,
    );
  });
});
