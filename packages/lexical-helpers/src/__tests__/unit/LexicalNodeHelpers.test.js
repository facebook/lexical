/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalEditor, State, NodeKey, LexicalNode} from 'lexical';

import {
  initializeUnitTest,
  $createTestElementNode,
} from '../../../../lexical/src/__tests__/utils';
import {
  $dfs__DEPRECATED,
  $areSiblingsNullOrSpace,
  $getNearestNodeOfType,
} from '@lexical/helpers/nodes';
import {
  $createTextNode,
  $getRoot,
  $createParagraphNode,
  $isParagraphNode,
} from 'lexical';
import {$createListNode, $createListItemNode, ListNode} from '@lexical/list';

describe('LexicalNodeHelpers tests', () => {
  initializeUnitTest((testEnv) => {
    /**
     *               R
     *        P1            P2
     *     B1     B2     T4 T5 B3
     *     T1   T2 T3          T6
     *
     *  DFS: R, P1, B1, T1, B2, T2, T3, P2, T4, T5, B3, T6
     */
    test('DFS node order', async () => {
      const editor: LexicalEditor = testEnv.editor;
      let expectedKeys: Array<NodeKey> = [];
      await editor.update((state: State) => {
        const root = $getRoot();
        const paragraph1 = $createParagraphNode();
        const paragraph2 = $createParagraphNode();
        const block1 = $createTestElementNode();
        const block2 = $createTestElementNode();
        const block3 = $createTestElementNode();
        const text1 = $createTextNode('text1');
        const text2 = $createTextNode('text2');
        const text3 = $createTextNode('text3');
        const text4 = $createTextNode('text4');
        const text5 = $createTextNode('text5');
        const text6 = $createTextNode('text6');
        root.append(paragraph1, paragraph2);
        paragraph1.append(block1, block2);
        paragraph2.append(text4, text5);
        text5.toggleFormat('bold'); // Prevent from merging with text 4
        paragraph2.append(block3);
        block1.append(text1);
        block2.append(text2, text3);
        text3.toggleFormat('bold'); // Prevent from merging with text2
        block3.append(text6);

        expectedKeys = [
          root.getKey(),
          paragraph1.getKey(),
          block1.getKey(),
          text1.getKey(),
          block2.getKey(),
          text2.getKey(),
          text3.getKey(),
          paragraph2.getKey(),
          text4.getKey(),
          text5.getKey(),
          block3.getKey(),
          text6.getKey(),
        ];
      });

      const dfsKeys = [];
      await editor.update((state: State) => {
        const root = $getRoot();
        $dfs__DEPRECATED(root, (node: LexicalNode) => {
          dfsKeys.push(node.getKey());
          return node;
        });
      });
      expect(dfsKeys).toEqual(expectedKeys);
    });

    test('Skip some DFS nodes', async () => {
      const editor: LexicalEditor = testEnv.editor;
      let expectedKeys: Array<NodeKey> = [];
      await editor.update((state: State) => {
        const root = $getRoot();
        const paragraph1 = $createParagraphNode();
        const block1 = $createTestElementNode();
        const block2 = $createTestElementNode();
        const block3 = $createTestElementNode();
        root.append(paragraph1);
        paragraph1.append(block1, block2, block3);

        expectedKeys = [root.getKey(), paragraph1.getKey(), block3.getKey()];
      });

      const dfsKeys = [];
      await editor.update((state: State) => {
        const root = $getRoot();
        $dfs__DEPRECATED(root, (node: LexicalNode) => {
          dfsKeys.push(node.getKey());
          if ($isParagraphNode(node)) {
            return (
              node.getLastChild() && node.getLastChild().getPreviousSibling()
            );
          }
          return node;
        });
      });
      expect(dfsKeys).toEqual(expectedKeys);
    });

    test('getNearestNodeOfType should return the top node if it is of the given type.', async () => {
      const editor: LexicalEditor = testEnv.editor;
      await editor.update((state: State) => {
        // Root
        //   |- ListNode
        //      |- ListItemNode
        //        |- Text
        //      |- ListItemNode
        //        |- Text
        const root = $getRoot();
        const topListNode = $createListNode('ul');
        const listItem1 = $createListItemNode();
        const listItem2 = $createListItemNode();
        const text1 = $createTextNode('Hello');
        const text2 = $createTextNode('world');
        root.append(topListNode);
        topListNode.append(listItem1);
        topListNode.append(listItem2);
        listItem1.append(text1);
        listItem2.append(text2);
        const result = $getNearestNodeOfType(text2, ListNode);
        expect(result.getKey()).toEqual(topListNode.getKey());
      });
    });

    test('getNearestNodeOfType should return a nested node of the given type.', async () => {
      const editor: LexicalEditor = testEnv.editor;
      await editor.update((state: State) => {
        // Root
        //   |- ListNode
        //      |- ListItemNode
        //        |- Text
        //      |- ListItemNode
        //        |- Text
        //      |- ListItemNode
        //        |-ListNode
        //          |-ListItemNode
        //            |- Text
        const root = $getRoot();
        const topListNode = $createListNode('ul');
        const nestedListNode = $createListNode('ul');
        const listItem1 = $createListItemNode();
        const listItem2 = $createListItemNode();
        const listItem3 = $createListItemNode();
        const listItem4 = $createListItemNode();
        const text1 = $createTextNode('Hello');
        const text2 = $createTextNode('from');
        const text3 = $createTextNode('the');
        root.append(topListNode);
        topListNode.append(listItem1);
        topListNode.append(listItem2);
        topListNode.append(listItem3);
        listItem3.append(nestedListNode);
        nestedListNode.append(listItem4);
        listItem1.append(text1);
        listItem2.append(text2);
        listItem4.append(text3);
        const result = $getNearestNodeOfType(text3, ListNode);
        expect(result.getKey()).toEqual(nestedListNode.getKey());
      });
    });

    test('getNearestNodeOfType should return a nested node of the given type if provided with an ElementNode as the starting point.', async () => {
      const editor: LexicalEditor = testEnv.editor;
      await editor.update((state: State) => {
        // Root
        //   |- ListNode
        //      |- ListItemNode
        //        |- Text
        //      |- ListItemNode
        //        |- Text
        //      |- ListItemNode
        //        |-ListNode
        //          |-ListItemNode
        //            |- Text
        const root = $getRoot();
        const topListNode = $createListNode('ul');
        const nestedListNode = $createListNode('ul');
        const listItem1 = $createListItemNode();
        const listItem2 = $createListItemNode();
        const listItem3 = $createListItemNode();
        const listItem4 = $createListItemNode();
        const text1 = $createTextNode('Hello');
        const text2 = $createTextNode('from');
        const text3 = $createTextNode('the');
        root.append(topListNode);
        topListNode.append(listItem1);
        topListNode.append(listItem2);
        topListNode.append(listItem3);
        listItem3.append(nestedListNode);
        nestedListNode.append(listItem4);
        listItem1.append(text1);
        listItem2.append(text2);
        listItem4.append(text3);
        const result = $getNearestNodeOfType(listItem4, ListNode);
        expect(result.getKey()).toEqual(nestedListNode.getKey());
      });
    });

    test('getNearestNodeOfType should return null if there is no node of the give type in the subtree.', async () => {
      const editor: LexicalEditor = testEnv.editor;
      await editor.update((state: State) => {
        // Root
        //   |- Paragraph
        //      |- Text
        const root = $getRoot();
        const paragraph = $createParagraphNode();
        const text = $createTextNode('Hello world');
        root.append(paragraph);
        paragraph.append(text);
        const result = $getNearestNodeOfType(text, ListNode);
        expect(result).toEqual(null);
      });
    });

    test('areSiblingsNullOrSpace', () => {
      const testCases = [
        ['foo ', ' bar', true],
        [' ', ' bar', true],
        ['foo ', ' ', true],
        [null, ' bar', true],
        ['foo ', null, true],
        ['newline', null, true],
        [null, 'newline', true],
        ['foo', null, false],
        [null, 'bar', false],
        ['foo ', 'bar', false],
        ['foo', 'bar', false],
        ['newline', 'bar', false],
      ];
      const editor: LexicalEditor = testEnv.editor;
      editor.update(() => {
        const root = $getRoot();
        root.append($createParagraphNode());
      });
      for (let i = 0; i < testCases.length; i++) {
        const [left, right, expected] = testCases[i];
        editor.update(() => {
          const root = $getRoot();
          const paragraph = root.getFirstChildOrThrow();
          const middle = $createTextNode('middle');
          paragraph.clear();
          if (left === 'newline') {
            editor.execCommand('insertLineBreak');
          } else if (left !== null) {
            paragraph.append($createTextNode(left));
          }
          paragraph.append(middle);
          if (right === 'newline') {
            editor.execCommand('insertLineBreak');
          } else if (right !== null) {
            paragraph.append($createTextNode(right));
          }
          expect([left, right, $areSiblingsNullOrSpace(middle)]).toEqual([
            left,
            right,
            expected,
          ]);
        });
      }
    });
  });
});
