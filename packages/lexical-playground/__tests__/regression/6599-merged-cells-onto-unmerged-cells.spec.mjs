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
} from '../utils/index.mjs';

test.describe('Regression test #6599', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));

  test('merging already merged cells into unmerged cells should not show the merge cells button', async ({
    page,
    isPlainText,
  }) => {
    test.skip(isPlainText);

    await focusEditor(page);

    await insertTable(page, 5, 5);

    await selectCellsFromTableCords(
      page,
      {x: 1, y: 1},
      {x: 2, y: 1},
      false,
      false,
    );

    await mergeTableCells(page);

    await selectCellsFromTableCords(
      page,
      {x: 1, y: 1},
      {x: 3, y: 1},
      false,
      false,
    );

    await click(page, '.table-cell-action-button-container');

    await expect(
      locate(page, '.item[data-test-id="table-merge-cells"]'),
    ).not.toBeVisible();
  });
});
