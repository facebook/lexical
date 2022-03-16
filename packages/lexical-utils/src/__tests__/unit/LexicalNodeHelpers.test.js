/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import {$createListItemNode, $createListNode, ListNode} from '@lexical/list';
import {$areSiblingsNullOrSpace, $getNearestNodeOfType} from '@lexical/utils';
import {
  $createParagraphNode,
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  LexicalEditor,
  NodeKey,
  State,
} from 'lexical';
import {
  $createTestElementNode,
  initializeUnitTest,
} from 'lexical/src/__tests__/utils';

import {$dfs} from '../..';

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
          {depth: 0, node: root.getKey()},
          {depth: 1, node: paragraph1.getKey()},
          {depth: 2, node: block1.getKey()},
          {depth: 3, node: text1.getKey()},
          {depth: 2, node: block2.getKey()},
          {depth: 3, node: text2.getKey()},
          {depth: 3, node: text3.getKey()},
          {depth: 1, node: paragraph2.getKey()},
          {depth: 2, node: text4.getKey()},
          {depth: 2, node: text5.getKey()},
          {depth: 2, node: block3.getKey()},
          {depth: 3, node: text6.getKey()},
        ];
      });
      editor.getEditorState().read(() => {
        const expectedNodes = expectedKeys.map(({depth, node: nodeKey}) => ({
          depth,
          node: $getNodeByKey(nodeKey).getLatest(),
        }));
        const first = expectedNodes[0];
        const second = expectedNodes[1];
        const last = expectedNodes[expectedNodes.length - 1];
        const secondToLast = expectedNodes[expectedNodes.length - 2];
        expect($dfs(first.node, last.node)).toEqual(expectedNodes);
        expect($dfs(second.node, secondToLast.node)).toEqual(
          expectedNodes.slice(1, expectedKeys.length - 1),
        );
        expect($dfs()).toEqual(expectedNodes);
        expect($dfs($getRoot())).toEqual(expectedNodes);
      });
    });

    test('DFS triggers getLatest()', async () => {
      const editor: LexicalEditor = testEnv.editor;
      let rootKey;
      let paragraphKey;
      let block1Key;
      let block2Key;
      await editor.update(() => {
        const root = $getRoot();
        const paragraph = $createParagraphNode();
        const block1 = $createTestElementNode();
        const block2 = $createTestElementNode();
        rootKey = root.getKey();
        paragraphKey = paragraph.getKey();
        block1Key = block1.getKey();
        block2Key = block2.getKey();
        root.append(paragraph);
        paragraph.append(block1, block2);
      });
      await editor.update(() => {
        const root = $getNodeByKey(rootKey);
        const paragraph = $getNodeByKey(paragraphKey);
        const block1 = $getNodeByKey(block1Key);
        const block2 = $getNodeByKey(block2Key);
        const block3 = $createTestElementNode();
        block1.append(block3);

        expect($dfs(root)).toEqual([
          {depth: 0, node: root.getLatest()},
          {depth: 1, node: paragraph.getLatest()},
          {depth: 2, node: block1.getLatest()},
          {depth: 3, node: block3.getLatest()},
          {depth: 2, node: block2.getLatest()},
        ]);
      });
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
