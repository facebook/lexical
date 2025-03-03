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

    if (isCollab) {
      // The contextual menu positioning needs fixing (it's hardcoded to show on the right side)
      page.setViewportSize({height: 1000, width: 3000});
    }

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
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
        <table class="PlaygroundEditorTheme__table">
          <colgroup>
            <col style="width: 92px" />
            <col style="width: 92px" />
            <col style="width: 92px" />
            <col style="width: 92px" />
          </colgroup>
          <tr>
            <th
              class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader">
              <p class="PlaygroundEditorTheme__paragraph"><br /></p>
            </th>
            <th
              class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader">
              <p class="PlaygroundEditorTheme__paragraph"><br /></p>
            </th>
            <th
              class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader">
              <p class="PlaygroundEditorTheme__paragraph"><br /></p>
            </th>
            <th
              class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader">
              <p class="PlaygroundEditorTheme__paragraph"><br /></p>
            </th>
          </tr>
          <tr>
            <th
              class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader">
              <p class="PlaygroundEditorTheme__paragraph"><br /></p>
            </th>
            <th
              class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader"
              rowspan="2">
              <p class="PlaygroundEditorTheme__paragraph"><br /></p>
            </th>
            <td class="PlaygroundEditorTheme__tableCell">
              <p class="PlaygroundEditorTheme__paragraph"><br /></p>
            </td>
            <td class="PlaygroundEditorTheme__tableCell">
              <p class="PlaygroundEditorTheme__paragraph"><br /></p>
            </td>
          </tr>
          <tr>
            <th
              class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader">
              <p class="PlaygroundEditorTheme__paragraph"><br /></p>
            </th>
            <td class="PlaygroundEditorTheme__tableCell">
              <p class="PlaygroundEditorTheme__paragraph"><br /></p>
            </td>
            <td class="PlaygroundEditorTheme__tableCell">
              <p class="PlaygroundEditorTheme__paragraph"><br /></p>
            </td>
          </tr>
          <tr>
            <th
              class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader">
              <p class="PlaygroundEditorTheme__paragraph"><br /></p>
            </th>
            <th
              class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader">
              <p class="PlaygroundEditorTheme__paragraph"><br /></p>
            </th>
            <td class="PlaygroundEditorTheme__tableCell">
              <p class="PlaygroundEditorTheme__paragraph"><br /></p>
            </td>
            <td class="PlaygroundEditorTheme__tableCell">
              <p class="PlaygroundEditorTheme__paragraph"><br /></p>
            </td>
          </tr>
        </table>
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
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

    if (isCollab) {
      // The contextual menu positioning needs fixing (it's hardcoded to show on the right side)
      page.setViewportSize({height: 1000, width: 3000});
    }

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
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
        <table class="PlaygroundEditorTheme__table">
          <colgroup>
            <col style="width: 92px" />
            <col style="width: 92px" />
            <col style="width: 92px" />
            <col style="width: 92px" />
          </colgroup>
          <tr>
            <th
              class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader">
              <p class="PlaygroundEditorTheme__paragraph"><br /></p>
            </th>
            <th
              class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader">
              <p class="PlaygroundEditorTheme__paragraph"><br /></p>
            </th>
            <th
              class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader">
              <p class="PlaygroundEditorTheme__paragraph"><br /></p>
            </th>
            <th
              class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader">
              <p class="PlaygroundEditorTheme__paragraph"><br /></p>
            </th>
          </tr>
          <tr>
            <th
              class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader">
              <p class="PlaygroundEditorTheme__paragraph"><br /></p>
            </th>
            <th
              class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader"
              colspan="2">
              <p class="PlaygroundEditorTheme__paragraph"><br /></p>
            </th>
            <th
              class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader">
              <p class="PlaygroundEditorTheme__paragraph"><br /></p>
            </th>
          </tr>
          <tr>
            <th
              class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader">
              <p class="PlaygroundEditorTheme__paragraph"><br /></p>
            </th>
            <td class="PlaygroundEditorTheme__tableCell">
              <p class="PlaygroundEditorTheme__paragraph"><br /></p>
            </td>
            <td class="PlaygroundEditorTheme__tableCell">
              <p class="PlaygroundEditorTheme__paragraph"><br /></p>
            </td>
            <td class="PlaygroundEditorTheme__tableCell">
              <p class="PlaygroundEditorTheme__paragraph"><br /></p>
            </td>
          </tr>
          <tr>
            <th
              class="PlaygroundEditorTheme__tableCell PlaygroundEditorTheme__tableCellHeader">
              <p class="PlaygroundEditorTheme__paragraph"><br /></p>
            </th>
            <td class="PlaygroundEditorTheme__tableCell">
              <p class="PlaygroundEditorTheme__paragraph"><br /></p>
            </td>
            <td class="PlaygroundEditorTheme__tableCell">
              <p class="PlaygroundEditorTheme__paragraph"><br /></p>
            </td>
            <td class="PlaygroundEditorTheme__tableCell">
              <p class="PlaygroundEditorTheme__paragraph"><br /></p>
            </td>
          </tr>
        </table>
        <p class="PlaygroundEditorTheme__paragraph"><br /></p>
      `,
    );
  });
});
