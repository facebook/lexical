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
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $nodesOfType,
  $selectAll,
} from 'lexical';
import {initializeUnitTest} from 'lexical/src/__tests__/utils';
import {describe, expect, test} from 'vitest';

import {$insertList} from '../../formatList';
import {$createListItemNode, $isListItemNode} from '../../LexicalListItemNode';
import {$createListNode, $isListNode, ListNode} from '../../LexicalListNode';

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

    test('formatting empty list items', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        $getRoot().append(
          $createListNode('bullet').append(
            $createListItemNode().append($createTextNode('Level 1')),
            $createListItemNode().append(
              $createListNode('bullet').append($createListItemNode()),
            ),
          ),
        );
      });

      await editor.update(() => {
        $selectAll();
        $insertList('number');
      });

      editor.read(() => {
        const lists = $nodesOfType(ListNode).filter(
          (node) => node.getListType() === 'number',
        );
        expect(lists.length).toBe(2);
      });
    });

    test('preserves element-anchored selection when converting paragraph with linebreak to list', async () => {
      const {editor} = testEnv;

      // Create a paragraph with text followed by a linebreak node and select the paragraph
      await editor.update(() => {
        const paragraph = $createParagraphNode();
        const textNode = $createTextNode('Item 1');
        const lineBreak = $createLineBreakNode();

        paragraph.append(textNode, lineBreak);
        $getRoot().append(paragraph);

        paragraph.select();
      });

      // Convert to list
      await editor.update(() => {
        $insertList('bullet');
      });

      // Verify the list was created and selection is correctly preserved
      editor.read(() => {
        const selection = $getSelection();
        const list = $getRoot().getFirstChildOrThrow();

        expect($isListNode(list)).toBe(true);

        if ($isListNode(list)) {
          const listItem = list.getFirstChildOrThrow();
          expect($isListItemNode(listItem)).toBe(true);

          // Verify selection is valid and anchored to the listItem, not the list
          if ($isRangeSelection(selection)) {
            expect(selection.anchor.key).toBe(listItem.getKey());
            expect(selection.focus.key).toBe(listItem.getKey());
            expect(selection.anchor.offset).toBe(2);
            expect(selection.focus.offset).toBe(2);
            expect(selection.anchor.type).toBe('element');
            expect(selection.focus.type).toBe('element');
          }
        }
      });
    });
  });
});
