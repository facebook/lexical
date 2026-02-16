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
  waitForSelector,
} from '../utils/index.mjs';

test.describe('ComponentPicker', () => {
  test('Can insert a heading using the component picker slash command', async ({
    page,
    isPlainText,
    isCollab,
  }) => {
    test.skip(isPlainText);
    await initialize({isCollab, page});
    await focusEditor(page);

    // Type slash to trigger the component picker
    await page.keyboard.type('/');

    // Wait for the typeahead popover to appear
    await waitForSelector(page, '.typeahead-popover');

    // Type to filter for heading
    await page.keyboard.type('heading');

    // Click on the heading option (h1)
    await click(page, '.typeahead-popover .icon.h1');

    // Type some text in the heading
    await page.keyboard.type('My Heading');

    await assertHTML(
      page,
      html`
        <h1 class="PlaygroundEditorTheme__h1" dir="auto">
          <span data-lexical-text="true">My Heading</span>
        </h1>
      `,
    );
  });

  test('Can insert a 2x2 table using the component picker slash command', async ({
    page,
    isPlainText,
    isCollab,
  }) => {
    test.skip(isPlainText);
    await initialize({isCollab, page});
    await focusEditor(page);

    // Type slash to trigger the component picker
    await page.keyboard.type('/');

    // Wait for the typeahead popover to appear
    await waitForSelector(page, '.typeahead-popover');

    // Type to filter for table
    await page.keyboard.type('2x2');

    // Click on the table option
    await click(page, '.typeahead-popover .icon.table');

    // Verify the table was inserted
    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph" dir="auto">
          <br />
        </p>
        <div class="PlaygroundEditorTheme__tableScrollableWrapper" dir="auto">
          <table class="PlaygroundEditorTheme__table">
            <colgroup>
              <col style="width: 92px" />
              <col style="width: 92px" />
            </colgroup>
            <tr>
              <th
                class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader">
                <p class="PlaygroundEditorTheme__paragraph">
                  <br />
                </p>
              </th>
              <th
                class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader">
                <p class="PlaygroundEditorTheme__paragraph">
                  <br />
                </p>
              </th>
            </tr>
            <tr>
              <th
                class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader">
                <p class="PlaygroundEditorTheme__paragraph">
                  <br />
                </p>
              </th>
              <td class="PlaygroundEditorTheme__tableCell">
                <p class="PlaygroundEditorTheme__paragraph">
                  <br />
                </p>
              </td>
            </tr>
          </table>
        </div>
        <p class="PlaygroundEditorTheme__paragraph" dir="auto">
          <br />
        </p>
      `,
    );
  });
});
