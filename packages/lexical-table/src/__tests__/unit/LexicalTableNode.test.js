/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$createTableNode} from '@lexical/table';

import {initializeUnitTest} from '../../../../lexical/src/__tests__/utils';

const editorConfig = Object.freeze({
  theme: {
    table: 'test-table-class',
    tableCell: 'test-table-cell-class',
    tableCellHeader: 'test-table-row-class',
  },
});

describe('LexicalTableNode tests', () => {
  initializeUnitTest((testEnv) => {
    test('TableNode.constructor', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const tableNode = $createTableNode();
        expect(tableNode).not.toBe(null);
      });
      expect(() => $createTableNode()).toThrow();
    });

    test('TableNode.createDOM()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const tableNode = $createTableNode();
        expect(tableNode.createDOM(editorConfig, editor).outerHTML).toBe(
          `<table class="${editorConfig.theme.table}"></table>`,
        );
      });
    });

    test('TableNode.setGrid()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const tableNode = $createTableNode();

        const grid = {
          cells: [
            {elem: null, highlighted: false, x: 0, y: 0},
            {elem: null, highlighted: false, x: 0, y: 1},
          ],
          columns: 1,
          rows: 2,
        };

        tableNode.setGrid(grid);

        expect(tableNode.getGrid()).toBe(grid);
      });
    });

    test('TableNode.setSelection()', async () => {
      const {editor} = testEnv;
      await editor.update(() => {
        const tableNode = $createTableNode();

        const grid = {
          cells: [
            {elem: null, highlighted: false, x: 0, y: 0},
            {elem: null, highlighted: false, x: 0, y: 1},
          ],
          columns: 1,
          rows: 2,
        };

        tableNode.setGrid(grid);

        const selectionState = {
          fromX: 0,
          fromY: 1,
          toX: 1,
          toY: 1,
        };

        tableNode.setSelectionState(selectionState);

        expect(tableNode.getSelectionState()).toBe(selectionState);
      });
    });
  });
});
