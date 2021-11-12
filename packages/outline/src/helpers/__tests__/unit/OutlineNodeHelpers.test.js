/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineEditor, State, NodeKey, OutlineNode} from 'outline';

import {
  initializeUnitTest,
  createTestBlockNode,
} from '../../../__tests__/utils';
import {dfs, getTopListNode, isLastItemInList} from 'outline/nodes';
import {createParagraphNode, isParagraphNode} from 'outline/ParagraphNode';
import {createTextNode} from 'outline';
import {createListNode} from 'outline/ListNode';
import {createListItemNode} from 'outline/ListItemNode';

describe('OutlineNodeHelpers tests', () => {
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
      const editor: OutlineEditor = testEnv.editor;
      let expectedKeys: Array<NodeKey> = [];
      await editor.update((state: State) => {
        const root = state.getRoot();
        const paragraph1 = createParagraphNode();
        const paragraph2 = createParagraphNode();
        const block1 = createTestBlockNode();
        const block2 = createTestBlockNode();
        const block3 = createTestBlockNode();
        const text1 = createTextNode('text1');
        const text2 = createTextNode('text2');
        const text3 = createTextNode('text3');
        const text4 = createTextNode('text4');
        const text5 = createTextNode('text5');
        const text6 = createTextNode('text6');
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
        const root = state.getRoot();
        dfs(root, (node: OutlineNode) => {
          dfsKeys.push(node.getKey());
          return node;
        });
      });
      expect(dfsKeys).toEqual(expectedKeys);
    });

    test('Skip some DFS nodes', async () => {
      const editor: OutlineEditor = testEnv.editor;
      let expectedKeys: Array<NodeKey> = [];
      await editor.update((state: State) => {
        const root = state.getRoot();
        const paragraph1 = createParagraphNode();
        const block1 = createTestBlockNode();
        const block2 = createTestBlockNode();
        const block3 = createTestBlockNode();
        root.append(paragraph1);
        paragraph1.append(block1, block2, block3);

        expectedKeys = [root.getKey(), paragraph1.getKey(), block3.getKey()];
      });

      const dfsKeys = [];
      await editor.update((state: State) => {
        const root = state.getRoot();
        dfs(root, (node: OutlineNode) => {
          dfsKeys.push(node.getKey());
          if (isParagraphNode(node)) {
            return (
              node.getLastChild() && node.getLastChild().getPreviousSibling()
            );
          }
          return node;
        });
      });
      expect(dfsKeys).toEqual(expectedKeys);
    });

    test('getTopListNode should return the top list node when the list is a direct child of the RootNode', async () => {
      const editor: OutlineEditor = testEnv.editor;
      await editor.update((state: State) => {
        // Root
        //   |- ListNode
        //         |- ListItemNode
        //         |- ListItemNode
        //         |- ListNode
        //               |- ListItemNode
        const root = state.getRoot();
        const topListNode = createListNode('ul');
        const secondLevelListNode = createListNode('ul');
        const listItem1 = createListItemNode();
        const listItem2 = createListItemNode();
        const listItem3 = createListItemNode();
        root.append(topListNode);
        topListNode.append(listItem1);
        topListNode.append(listItem2);
        topListNode.append(secondLevelListNode);
        secondLevelListNode.append(listItem3);
        const result = getTopListNode(listItem3);
        expect(result.getKey()).toEqual(topListNode.getKey());
      });
    });

    test('getTopListNode should return the top list node when the list is not a direct child of the RootNode', async () => {
      const editor: OutlineEditor = testEnv.editor;
      await editor.update((state: State) => {
        // Root
        // |- ParagaphNode
        //     |- ListNode
        //        |- ListItemNode
        //        |- ListItemNode
        //           |- ListNode
        //              |- ListItemNode
        const root = state.getRoot();
        const paragraphNode = createParagraphNode();
        const topListNode = createListNode('ul');
        const secondLevelListNode = createListNode('ul');
        const listItem1 = createListItemNode();
        const listItem2 = createListItemNode();
        const listItem3 = createListItemNode();
        root.append(paragraphNode);
        paragraphNode.append(topListNode);
        topListNode.append(listItem1);
        topListNode.append(listItem2);
        topListNode.append(secondLevelListNode);
        secondLevelListNode.append(listItem3);
        const result = getTopListNode(listItem3);
        expect(result.getKey()).toEqual(topListNode.getKey());
      });
    });

    test('getTopListNode should return the top list node when the list item is deeply nested.', async () => {
      const editor: OutlineEditor = testEnv.editor;
      await editor.update((state: State) => {
        // Root
        // |- ParagaphNode
        //     |- ListNode
        //        |- ListItemNode
        //           |- ListNode
        //              |- ListItemNode
        //                  |- ListNode
        //                      |- ListItemNode
        //        |- ListItemNode
        const root = state.getRoot();
        const paragraphNode = createParagraphNode();
        const topListNode = createListNode('ul');
        const secondLevelListNode = createListNode('ul');
        const thirdLevelListNode = createListNode('ul');
        const listItem1 = createListItemNode();
        const listItem2 = createListItemNode();
        const listItem3 = createListItemNode();
        const listItem4 = createListItemNode();
        root.append(paragraphNode);
        paragraphNode.append(topListNode);
        topListNode.append(listItem1);
        listItem1.append(secondLevelListNode);
        secondLevelListNode.append(listItem2);
        listItem2.append(thirdLevelListNode);
        thirdLevelListNode.append(listItem3);
        topListNode.append(listItem4);
        const result = getTopListNode(listItem4);
        expect(result.getKey()).toEqual(topListNode.getKey());
      });
    });

    test('isLastItemInList should return true if the listItem is the last in a nested list.', async () => {
      const editor: OutlineEditor = testEnv.editor;
      await editor.update((state: State) => {
        // Root
        //   |- ListNode
        //      |- ListItemNode
        //         |- ListNode
        //            |- ListItemNode
        //                |- ListNode
        //                    |- ListItemNode
        const root = state.getRoot();
        const topListNode = createListNode('ul');
        const secondLevelListNode = createListNode('ul');
        const thirdLevelListNode = createListNode('ul');
        const listItem1 = createListItemNode();
        const listItem2 = createListItemNode();
        const listItem3 = createListItemNode();
        root.append(topListNode);
        topListNode.append(listItem1);
        listItem1.append(secondLevelListNode);
        secondLevelListNode.append(listItem2);
        listItem2.append(thirdLevelListNode);
        thirdLevelListNode.append(listItem3);
        const result = isLastItemInList(listItem3);
        expect(result).toEqual(true);
      });
    });

    test('isLastItemInList should return true if the listItem is the last in a non-nested list.', async () => {
      const editor: OutlineEditor = testEnv.editor;
      await editor.update((state: State) => {
        // Root
        //   |- ListNode
        //      |- ListItemNode
        //      |- ListItemNode
        const root = state.getRoot();
        const topListNode = createListNode('ul');
        const listItem1 = createListItemNode();
        const listItem2 = createListItemNode();
        root.append(topListNode);
        topListNode.append(listItem1);
        topListNode.append(listItem2);
        const result = isLastItemInList(listItem2);
        expect(result).toEqual(true);
      });
    });

    test('isLastItemInList should return false if the listItem is not the last in a nested list.', async () => {
      const editor: OutlineEditor = testEnv.editor;
      await editor.update((state: State) => {
        // Root
        //   |- ListNode
        //      |- ListItemNode
        //         |- ListNode
        //            |- ListItemNode
        //                |- ListNode
        //                    |- ListItemNode
        const root = state.getRoot();
        const topListNode = createListNode('ul');
        const secondLevelListNode = createListNode('ul');
        const thirdLevelListNode = createListNode('ul');
        const listItem1 = createListItemNode();
        const listItem2 = createListItemNode();
        const listItem3 = createListItemNode();
        root.append(topListNode);
        topListNode.append(listItem1);
        listItem1.append(secondLevelListNode);
        secondLevelListNode.append(listItem2);
        listItem2.append(thirdLevelListNode);
        thirdLevelListNode.append(listItem3);
        const result = isLastItemInList(listItem2);
        expect(result).toEqual(false);
      });
    });

    test('isLastItemInList should return true if the listItem is not the last in a non-nested list.', async () => {
      const editor: OutlineEditor = testEnv.editor;
      await editor.update((state: State) => {
        // Root
        //   |- ListNode
        //      |- ListItemNode
        //      |- ListItemNode
        const root = state.getRoot();
        const topListNode = createListNode('ul');
        const listItem1 = createListItemNode();
        const listItem2 = createListItemNode();
        root.append(topListNode);
        topListNode.append(listItem1);
        topListNode.append(listItem2);
        const result = isLastItemInList(listItem1);
        expect(result).toEqual(false);
      });
    });
  });
});
