/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

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
});
