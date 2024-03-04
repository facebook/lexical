/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$createTableRowNode} from '@lexical/table';
import {initializeUnitTest} from 'lexical/src/__tests__/utils';

const editorConfig = Object.freeze({
  namespace: '',
  theme: {
    tableRow: 'test-table-row-class',
  },
});

describe('LexicalTableRowNode tests', () => {
  initializeUnitTest((testEnv) => {
    test('TableRowNode.constructor', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const rowNode = $createTableRowNode();

        expect(rowNode).not.toBe(null);
      });

      expect(() => $createTableRowNode()).toThrow();
    });

    test('TableRowNode.createDOM()', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const rowNode = $createTableRowNode();
        expect(rowNode.createDOM(editorConfig).outerHTML).toBe(
          `<tr class="${editorConfig.theme.tableRow}"></tr>`,
        );

        const rowHeight = 36;
        const rowWithCustomHeightNode = $createTableRowNode(36);
        expect(rowWithCustomHeightNode.createDOM(editorConfig).outerHTML).toBe(
          `<tr style="height: ${rowHeight}px;" class="${editorConfig.theme.tableRow}"></tr>`,
        );
      });
    });
  });
});
