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
  focusEditor,
  html,
  initialize,
  test,
} from '../utils/index.mjs';

test('Layout - removes layout completely when both columns are empty and backspace is pressed at the first layout item', async ({
  page,
  isPlainText,
  isCollab,
}) => {
  test.skip(isPlainText);
  await initialize({isCollab, page});
  await focusEditor(page);

  await page.keyboard.type('/');
  await click(page, '.typeahead-popover .icon.columns');
  await click(page, '.Modal__modal .Modal__content .Button__root');

  // Focus on second column
  await click(
    page,
    '.PlaygroundEditorTheme__layoutContainer .PlaygroundEditorTheme__layoutItem:nth-child(2)',
  );
  await page.keyboard.press('Backspace');

  await assertHTML(
    page,
    html`
      <p class="PlaygroundEditorTheme__paragraph"><br /></p>
      <div
        class="PlaygroundEditorTheme__layoutContainer"
        style="grid-template-columns: 1fr 1fr">
        <div
          class="PlaygroundEditorTheme__layoutItem"
          data-lexical-layout-item="true">
          <p class="PlaygroundEditorTheme__paragraph"><br /></p>
        </div>
        <div
          class="PlaygroundEditorTheme__layoutItem"
          data-lexical-layout-item="true">
          <p class="PlaygroundEditorTheme__paragraph"><br /></p>
        </div>
      </div>
      <p class="PlaygroundEditorTheme__paragraph"><br /></p>
    `,
  );

  // Delete content from first column - entire layout should be removed
  await click(
    page,
    '.PlaygroundEditorTheme__layoutContainer .PlaygroundEditorTheme__layoutItem:nth-child(1)',
  );
  await page.keyboard.press('Backspace');
  await assertHTML(
    page,
    html`
      <p class="PlaygroundEditorTheme__paragraph"><br /></p>
      <p class="PlaygroundEditorTheme__paragraph"><br /></p>
    `,
  );
});
