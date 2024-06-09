/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {
  click,
  expect,
  focusEditor,
  initialize,
  insertTable,
  locate,
  mergeTableCells,
  selectCellsFromTableCords,
  test,
  unmergeTableCell,
} from '../utils/index.mjs';

test.describe('Regression test #4876', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));
  test('unmerging cells should add cells to correct rows', async ({
    page,
    isPlainText,
    isCollab,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);

    await insertTable(page, 4, 4);

    await click(page, '.PlaygroundEditorTheme__tableCell');
    await selectCellsFromTableCords(
      page,
      {x: 0, y: 1},
      {x: 1, y: 3},
      true,
      false,
    );

    await mergeTableCells(page);

    await unmergeTableCell(page);

    const tableRow = await locate(page, 'tr');
    expect(await tableRow.count()).toBe(4);
    for (let i = 0; i < 4; i++) {
      const tableCells = tableRow.nth(i).locator('th, td');
      expect(await tableCells.count()).toBe(4);
    }
  });
});
