/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {
  assertTableHTML as assertHTML,
  click,
  focusEditor,
  html,
  initialize,
  insertTable,
  mergeTableCells,
  selectCellsFromTableCords,
  test,
  toggleColumnHeader,
  toggleRowHeader,
} from '../utils/index.mjs';

test.describe('Regression test #7266', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));

  test('toggling column header with merged column cells should only apply column header to the selected column', async ({
    page,
    isPlainText,
    isCollab,
  }) => {
    test.skip(isPlainText);

    await initialize({isCollab, page});

    await focusEditor(page);

    await insertTable(page, 4, 4);

    await click(page, '.PlaygroundEditorTheme__tableCell');
    await selectCellsFromTableCords(
      page,
      {x: 1, y: 1},
      {x: 1, y: 2},
      false,
      false,
    );

    await mergeTableCells(page);

    await toggleColumnHeader(page);

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph" dir="auto"><br /></p>
        <table class="PlaygroundEditorTheme__table" dir="auto">
          <colgroup>
            <col style="width: 92px" />
            <col style="width: 92px" />
            <col style="width: 92px" />
            <col style="width: 92px" />
          </colgroup>
          <tr dir="auto">
            <th
              class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader"
              dir="auto">
              <p class="PlaygroundEditorTheme__paragraph" dir="auto"><br /></p>
            </th>
            <th
              class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader"
              dir="auto">
              <p class="PlaygroundEditorTheme__paragraph" dir="auto"><br /></p>
            </th>
            <th
              class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader"
              dir="auto">
              <p class="PlaygroundEditorTheme__paragraph" dir="auto"><br /></p>
            </th>
            <th
              class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader"
              dir="auto">
              <p class="PlaygroundEditorTheme__paragraph" dir="auto"><br /></p>
            </th>
          </tr>
          <tr dir="auto">
            <th
              class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader"
              dir="auto">
              <p class="PlaygroundEditorTheme__paragraph" dir="auto"><br /></p>
            </th>
            <th
              class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader"
              dir="auto"
              rowspan="2">
              <p class="PlaygroundEditorTheme__paragraph" dir="auto"><br /></p>
            </th>
            <td class="PlaygroundEditorTheme__tableCell" dir="auto">
              <p class="PlaygroundEditorTheme__paragraph" dir="auto"><br /></p>
            </td>
            <td class="PlaygroundEditorTheme__tableCell" dir="auto">
              <p class="PlaygroundEditorTheme__paragraph" dir="auto"><br /></p>
            </td>
          </tr>
          <tr dir="auto">
            <th
              class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader"
              dir="auto">
              <p class="PlaygroundEditorTheme__paragraph" dir="auto"><br /></p>
            </th>
            <td class="PlaygroundEditorTheme__tableCell" dir="auto">
              <p class="PlaygroundEditorTheme__paragraph" dir="auto"><br /></p>
            </td>
            <td class="PlaygroundEditorTheme__tableCell" dir="auto">
              <p class="PlaygroundEditorTheme__paragraph" dir="auto"><br /></p>
            </td>
          </tr>
          <tr dir="auto">
            <th
              class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader"
              dir="auto">
              <p class="PlaygroundEditorTheme__paragraph" dir="auto"><br /></p>
            </th>
            <th
              class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader"
              dir="auto">
              <p class="PlaygroundEditorTheme__paragraph" dir="auto"><br /></p>
            </th>
            <td class="PlaygroundEditorTheme__tableCell" dir="auto">
              <p class="PlaygroundEditorTheme__paragraph" dir="auto"><br /></p>
            </td>
            <td class="PlaygroundEditorTheme__tableCell" dir="auto">
              <p class="PlaygroundEditorTheme__paragraph" dir="auto"><br /></p>
            </td>
          </tr>
        </table>
        <p class="PlaygroundEditorTheme__paragraph" dir="auto"><br /></p>
      `,
    );
  });

  test('toggling row header with merged row cells should only apply row header to the selected row', async ({
    page,
    isPlainText,
    isCollab,
  }) => {
    test.skip(isPlainText);

    await initialize({isCollab, page});

    await focusEditor(page);

    await insertTable(page, 4, 4);

    await click(page, '.PlaygroundEditorTheme__tableCell');
    await selectCellsFromTableCords(
      page,
      {x: 1, y: 1},
      {x: 2, y: 1},
      false,
      false,
    );

    await mergeTableCells(page);

    await toggleRowHeader(page);

    await assertHTML(
      page,
      html`
        <p class="PlaygroundEditorTheme__paragraph" dir="auto"><br /></p>
        <table class="PlaygroundEditorTheme__table" dir="auto">
          <colgroup>
            <col style="width: 92px" />
            <col style="width: 92px" />
            <col style="width: 92px" />
            <col style="width: 92px" />
          </colgroup>
          <tr dir="auto">
            <th
              class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader"
              dir="auto">
              <p class="PlaygroundEditorTheme__paragraph" dir="auto"><br /></p>
            </th>
            <th
              class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader"
              dir="auto">
              <p class="PlaygroundEditorTheme__paragraph" dir="auto"><br /></p>
            </th>
            <th
              class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader"
              dir="auto">
              <p class="PlaygroundEditorTheme__paragraph" dir="auto"><br /></p>
            </th>
            <th
              class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader"
              dir="auto">
              <p class="PlaygroundEditorTheme__paragraph" dir="auto"><br /></p>
            </th>
          </tr>
          <tr dir="auto">
            <th
              class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader"
              dir="auto">
              <p class="PlaygroundEditorTheme__paragraph" dir="auto"><br /></p>
            </th>
            <th
              class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader"
              colspan="2"
              dir="auto">
              <p class="PlaygroundEditorTheme__paragraph" dir="auto"><br /></p>
            </th>
            <th
              class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader"
              dir="auto">
              <p class="PlaygroundEditorTheme__paragraph" dir="auto"><br /></p>
            </th>
          </tr>
          <tr dir="auto">
            <th
              class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader"
              dir="auto">
              <p class="PlaygroundEditorTheme__paragraph" dir="auto"><br /></p>
            </th>
            <td class="PlaygroundEditorTheme__tableCell" dir="auto">
              <p class="PlaygroundEditorTheme__paragraph" dir="auto"><br /></p>
            </td>
            <td class="PlaygroundEditorTheme__tableCell" dir="auto">
              <p class="PlaygroundEditorTheme__paragraph" dir="auto"><br /></p>
            </td>
            <td class="PlaygroundEditorTheme__tableCell" dir="auto">
              <p class="PlaygroundEditorTheme__paragraph" dir="auto"><br /></p>
            </td>
          </tr>
          <tr dir="auto">
            <th
              class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader"
              dir="auto">
              <p class="PlaygroundEditorTheme__paragraph" dir="auto"><br /></p>
            </th>
            <td class="PlaygroundEditorTheme__tableCell" dir="auto">
              <p class="PlaygroundEditorTheme__paragraph" dir="auto"><br /></p>
            </td>
            <td class="PlaygroundEditorTheme__tableCell" dir="auto">
              <p class="PlaygroundEditorTheme__paragraph" dir="auto"><br /></p>
            </td>
            <td class="PlaygroundEditorTheme__tableCell" dir="auto">
              <p class="PlaygroundEditorTheme__paragraph" dir="auto"><br /></p>
            </td>
          </tr>
        </table>
        <p class="PlaygroundEditorTheme__paragraph" dir="auto"><br /></p>
      `,
    );
  });
});
