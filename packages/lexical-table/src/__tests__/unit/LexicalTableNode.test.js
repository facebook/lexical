/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$createTableNode} from '@lexical/table';
import {initializeUnitTest} from 'lexical/src/__tests__/utils';

// No idea why we suddenly need to do this, but it fixes the tests
// with latest experimental React version.
global.IS_REACT_ACT_ENVIRONMENT = true;

const editorConfig = Object.freeze({
  theme: {
    TableCellHeaderStates: 'test-table-row-class',
    table: 'test-table-class',
    tableCell: 'test-table-cell-class',
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
  });
});
