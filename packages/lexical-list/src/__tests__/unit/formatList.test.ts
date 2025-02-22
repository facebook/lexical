/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $createTableCellNode,
  $createTableNode,
  $createTableRowNode,
  TableCellNode,
  TableNode,
  TableRowNode,
} from '@lexical/table';
import {$createParagraphNode, $createTextNode, $getRoot} from 'lexical';
import {initializeUnitTest} from 'lexical/src/__tests__/utils';

import {$insertList} from '../../formatList';
import {$isListNode} from '../../LexicalListNode';

describe('insertList', () => {
  initializeUnitTest((testEnv) => {
    test('inserting with empty root selection', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        $getRoot().select();
      });

      await editor.update(() => {
        $insertList('number');
      });

      editor.read(() => {
        const root = $getRoot();

        expect(root.getChildrenSize()).toBe(1);

        const firstChild = root.getFirstChildOrThrow();

        expect($isListNode(firstChild)).toBe(true);
      });
    });

    test('inserting in root selection with existing child', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        $getRoot().select();
        $getRoot().append(
          $createParagraphNode().append($createTextNode('hello')),
        );
      });

      await editor.update(() => {
        $insertList('number');
      });

      editor.read(() => {
        const root = $getRoot();

        expect(root.getChildrenSize()).toBe(1);

        const firstChild = root.getFirstChildOrThrow();

        expect($isListNode(firstChild)).toBe(true);
      });
    });

    test('inserting with empty shadow root selection', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const table = $createTableNode();
        const row = $createTableRowNode();
        const cell = $createTableCellNode();
        $getRoot().append(table.append(row.append(cell)));
        cell.select();
      });

      await editor.update(() => {
        $insertList('number');
      });

      editor.read(() => {
        const cell = $getRoot()
          .getFirstChildOrThrow<TableNode>()
          .getFirstChildOrThrow<TableRowNode>()
          .getFirstChildOrThrow<TableCellNode>();

        expect(cell.getChildrenSize()).toBe(1);

        const firstChild = cell.getFirstChildOrThrow();

        expect($isListNode(firstChild)).toBe(true);
      });
    });
  });
});
