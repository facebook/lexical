/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {moveToLineEnd} from '../../../keyboardShortcuts/index.mjs';
import {
  assertHTML,
  click,
  doubleClick,
  focusEditor,
  html,
  initialize,
  pasteFromClipboard,
  test,
  withExclusiveClipboardAccess,
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
    await withExclusiveClipboardAccess(async () => {
      await click(page, 'div[contenteditable="false"] span', {button: 'right'});
      await click(page, '#typeahead-menu [role="option"] :text("Copy")');

      await click(page, '.unlock');
      await focusEditor(page);

      await pasteFromClipboard(page);
    });

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
  test('Rich text Copy and Paste with  different Font Size', async ({
    page,
    isPlainText,
    isCollab,
    browserName,
  }) => {
    test.skip(isCollab || isPlainText || browserName !== 'chromium');

    await withExclusiveClipboardAccess(async () => {
      await page
        .context()
        .grantPermissions(['clipboard-read', 'clipboard-write']);

      await click(page, '.font-increment');
      await focusEditor(page);
      await page.keyboard.type('MLH Fellowship');
      //await page.pause();
      await moveToLineEnd(page);
      await page.keyboard.press('Enter');
      await page.keyboard.type('Fall 2024');

      await click(page, '.lock');

      await doubleClick(page, 'div[contenteditable="false"] span');
      await click(page, 'div[contenteditable="false"] span', {button: 'right'});
      await click(page, '#typeahead-menu [role="option"] :text("Copy")');

      await click(page, '.unlock');
      await focusEditor(page);
      await pasteFromClipboard(page);
    });

    await assertHTML(
      page,
      html`
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span style="font-size: 17px;" data-lexical-text="true">
            MLH Fellowship
          </span>
        </p>
        <p
          class="PlaygroundEditorTheme__paragraph PlaygroundEditorTheme__ltr"
          dir="ltr">
          <span style="font-size: 17px;" data-lexical-text="true">
            Fall 2024Fellowship
          </span>
        </p>
      `,
    );
  });
});
