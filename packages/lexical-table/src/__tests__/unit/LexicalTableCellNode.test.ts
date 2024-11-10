/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$createTableCellNode, TableCellHeaderStates} from '@lexical/table';
import {initializeUnitTest} from 'lexical/src/__tests__/utils';

const editorConfig = Object.freeze({
  namespace: '',
  theme: {
    tableCell: 'test-table-cell-class',
  },
});

describe('LexicalTableCellNode tests', () => {
  initializeUnitTest((testEnv) => {
    test('TableCellNode.constructor', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const cellNode = $createTableCellNode(TableCellHeaderStates.NO_STATUS);

        expect(cellNode).not.toBe(null);
      });

      expect(() =>
        $createTableCellNode(TableCellHeaderStates.NO_STATUS),
      ).toThrow();
    });

    test('TableCellNode.createDOM()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const cellNode = $createTableCellNode(TableCellHeaderStates.NO_STATUS);
        expect(cellNode.createDOM(editorConfig).outerHTML).toBe(
          `<td class="${editorConfig.theme.tableCell}"></td>`,
        );

        const headerCellNode = $createTableCellNode(TableCellHeaderStates.ROW);
        expect(headerCellNode.createDOM(editorConfig).outerHTML).toBe(
          `<th class="${editorConfig.theme.tableCell}"></th>`,
        );

        const colSpan = 2;
        const cellWithRowSpanNode = $createTableCellNode(
          TableCellHeaderStates.NO_STATUS,
          colSpan,
        );
        expect(cellWithRowSpanNode.createDOM(editorConfig).outerHTML).toBe(
          `<td colspan="${colSpan}" class="${editorConfig.theme.tableCell}"></td>`,
        );

        const cellWidth = 200;
        const cellWithCustomWidthNode = $createTableCellNode(
          TableCellHeaderStates.NO_STATUS,
          undefined,
          cellWidth,
        );
        expect(cellWithCustomWidthNode.createDOM(editorConfig).outerHTML).toBe(
          `<td style="width: ${cellWidth}px;" class="${editorConfig.theme.tableCell}"></td>`,
        );
      });
    });
  });
});
