/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  assertGridSelectionCoordinates,
  click,
  focusEditor,
  initialize,
  insertTable,
  selectCellsFromTableCords,
  test,
} from '../utils/index.mjs';

test.describe('Regression test #4697', () => {
  test.beforeEach(({isCollab, page}) => initialize({isCollab, page}));
  test('repeated table selection results in grid selection', async ({
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
      {x: 1, y: 1},
      {x: 2, y: 2},
      false,
      false,
    );

    await selectCellsFromTableCords(
      page,
      {x: 2, y: 1},
      {x: 2, y: 2},
      false,
      false,
    );

    await assertGridSelectionCoordinates(page, {
      anchor: {x: 2, y: 1},
      focus: {x: 2, y: 2},
    });
  });
});
