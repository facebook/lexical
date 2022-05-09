/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$createListItemNode, $createListNode} from '@lexical/list';
import {$createParagraphNode, $getRoot} from 'lexical';
import {initializeUnitTest} from 'lexical/src/__tests__/utils';

import {$getListDepth, $getTopListNode, $isLastItemInList} from '../../utils';

// No idea why we suddenly need to do this, but it fixes the tests
// with latest experimental React version.
global.IS_REACT_ACT_ENVIRONMENT = true;

describe('Lexical List Utils tests', () => {
  initializeUnitTest((testEnv) => {
    test('getListDepth should return the 1-based depth of a list with one levels', async () => {
      const editor: LexicalEditor = testEnv.editor;
      await editor.update((state: State) => {
        // Root
        //   |- ListNode
        const root = $getRoot();
        const topListNode = $createListNode('ul');
        root.append(topListNode);
        const result = $getListDepth(topListNode);
        expect(result).toEqual(1);
      });
    });

    test('getListDepth should return the 1-based depth of a list with two levels', async () => {
      const editor: LexicalEditor = testEnv.editor;
      await editor.update((state: State) => {
        // Root
        //   |- ListNode
        //         |- ListItemNode
        //         |- ListItemNode
        //         |- ListNode
        //               |- ListItemNode
        const root = $getRoot();
        const topListNode = $createListNode('ul');
        const secondLevelListNode = $createListNode('ul');
        const listItem1 = $createListItemNode();
        const listItem2 = $createListItemNode();
        const listItem3 = $createListItemNode();
        root.append(topListNode);
        topListNode.append(listItem1);
        topListNode.append(listItem2);
        topListNode.append(secondLevelListNode);
        secondLevelListNode.append(listItem3);
        const result = $getListDepth(secondLevelListNode);
        expect(result).toEqual(2);
      });
    });

    test('getListDepth should return the 1-based depth of a list with five levels', async () => {
      const editor: LexicalEditor = testEnv.editor;
      await editor.update((state: State) => {
        // Root
        //   |- ListNode
        //        |- ListItemNode
        //             |- ListNode
        //                  |- ListItemNode
        //                       |- ListNode
        //                            |- ListItemNode
        //                                 |- ListNode
        //                                     |- ListItemNode
        //                                          |- ListNode
        const root = $getRoot();
        const topListNode = $createListNode('ul');
        const listNode2 = $createListNode('ul');
        const listNode3 = $createListNode('ul');
        const listNode4 = $createListNode('ul');
        const listNode5 = $createListNode('ul');
        const listItem1 = $createListItemNode();
        const listItem2 = $createListItemNode();
        const listItem3 = $createListItemNode();
        const listItem4 = $createListItemNode();
        root.append(topListNode);
        topListNode.append(listItem1);
        listItem1.append(listNode2);
        listNode2.append(listItem2);
        listItem2.append(listNode3);
        listNode3.append(listItem3);
        listItem3.append(listNode4);
        listNode4.append(listItem4);
        listItem4.append(listNode5);
        const result = $getListDepth(listNode5);
        expect(result).toEqual(5);
      });
    });

    test('getTopListNode should return the top list node when the list is a direct child of the RootNode', async () => {
      const editor: LexicalEditor = testEnv.editor;
      await editor.update((state: State) => {
        // Root
        //   |- ListNode
        //         |- ListItemNode
        //         |- ListItemNode
        //         |- ListNode
        //               |- ListItemNode
        const root = $getRoot();
        const topListNode = $createListNode('ul');
        const secondLevelListNode = $createListNode('ul');
        const listItem1 = $createListItemNode();
        const listItem2 = $createListItemNode();
        const listItem3 = $createListItemNode();
        root.append(topListNode);
        topListNode.append(listItem1);
        topListNode.append(listItem2);
        topListNode.append(secondLevelListNode);
        secondLevelListNode.append(listItem3);
        const result = $getTopListNode(listItem3);
        expect(result.getKey()).toEqual(topListNode.getKey());
      });
    });

    test('getTopListNode should return the top list node when the list is not a direct child of the RootNode', async () => {
      const editor: LexicalEditor = testEnv.editor;
      await editor.update((state: State) => {
        // Root
        // |- ParagaphNode
        //     |- ListNode
        //        |- ListItemNode
        //        |- ListItemNode
        //           |- ListNode
        //              |- ListItemNode
        const root = $getRoot();
        const paragraphNode = $createParagraphNode();
        const topListNode = $createListNode('ul');
        const secondLevelListNode = $createListNode('ul');
        const listItem1 = $createListItemNode();
        const listItem2 = $createListItemNode();
        const listItem3 = $createListItemNode();
        root.append(paragraphNode);
        paragraphNode.append(topListNode);
        topListNode.append(listItem1);
        topListNode.append(listItem2);
        topListNode.append(secondLevelListNode);
        secondLevelListNode.append(listItem3);
        const result = $getTopListNode(listItem3);
        expect(result.getKey()).toEqual(topListNode.getKey());
      });
    });

    test('getTopListNode should return the top list node when the list item is deeply nested.', async () => {
      const editor: LexicalEditor = testEnv.editor;
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
        const root = $getRoot();
        const paragraphNode = $createParagraphNode();
        const topListNode = $createListNode('ul');
        const secondLevelListNode = $createListNode('ul');
        const thirdLevelListNode = $createListNode('ul');
        const listItem1 = $createListItemNode();
        const listItem2 = $createListItemNode();
        const listItem3 = $createListItemNode();
        const listItem4 = $createListItemNode();
        root.append(paragraphNode);
        paragraphNode.append(topListNode);
        topListNode.append(listItem1);
        listItem1.append(secondLevelListNode);
        secondLevelListNode.append(listItem2);
        listItem2.append(thirdLevelListNode);
        thirdLevelListNode.append(listItem3);
        topListNode.append(listItem4);
        const result = $getTopListNode(listItem4);
        expect(result.getKey()).toEqual(topListNode.getKey());
      });
    });

    test('isLastItemInList should return true if the listItem is the last in a nested list.', async () => {
      const editor: LexicalEditor = testEnv.editor;
      await editor.update((state: State) => {
        // Root
        //   |- ListNode
        //      |- ListItemNode
        //         |- ListNode
        //            |- ListItemNode
        //                |- ListNode
        //                    |- ListItemNode
        const root = $getRoot();
        const topListNode = $createListNode('ul');
        const secondLevelListNode = $createListNode('ul');
        const thirdLevelListNode = $createListNode('ul');
        const listItem1 = $createListItemNode();
        const listItem2 = $createListItemNode();
        const listItem3 = $createListItemNode();
        root.append(topListNode);
        topListNode.append(listItem1);
        listItem1.append(secondLevelListNode);
        secondLevelListNode.append(listItem2);
        listItem2.append(thirdLevelListNode);
        thirdLevelListNode.append(listItem3);
        const result = $isLastItemInList(listItem3);
        expect(result).toEqual(true);
      });
    });

    test('isLastItemInList should return true if the listItem is the last in a non-nested list.', async () => {
      const editor: LexicalEditor = testEnv.editor;
      await editor.update((state: State) => {
        // Root
        //   |- ListNode
        //      |- ListItemNode
        //      |- ListItemNode
        const root = $getRoot();
        const topListNode = $createListNode('ul');
        const listItem1 = $createListItemNode();
        const listItem2 = $createListItemNode();
        root.append(topListNode);
        topListNode.append(listItem1);
        topListNode.append(listItem2);
        const result = $isLastItemInList(listItem2);
        expect(result).toEqual(true);
      });
    });

    test('isLastItemInList should return false if the listItem is not the last in a nested list.', async () => {
      const editor: LexicalEditor = testEnv.editor;
      await editor.update((state: State) => {
        // Root
        //   |- ListNode
        //      |- ListItemNode
        //         |- ListNode
        //            |- ListItemNode
        //                |- ListNode
        //                    |- ListItemNode
        const root = $getRoot();
        const topListNode = $createListNode('ul');
        const secondLevelListNode = $createListNode('ul');
        const thirdLevelListNode = $createListNode('ul');
        const listItem1 = $createListItemNode();
        const listItem2 = $createListItemNode();
        const listItem3 = $createListItemNode();
        root.append(topListNode);
        topListNode.append(listItem1);
        listItem1.append(secondLevelListNode);
        secondLevelListNode.append(listItem2);
        listItem2.append(thirdLevelListNode);
        thirdLevelListNode.append(listItem3);
        const result = $isLastItemInList(listItem2);
        expect(result).toEqual(false);
      });
    });

    test('isLastItemInList should return true if the listItem is not the last in a non-nested list.', async () => {
      const editor: LexicalEditor = testEnv.editor;
      await editor.update((state: State) => {
        // Root
        //   |- ListNode
        //      |- ListItemNode
        //      |- ListItemNode
        const root = $getRoot();
        const topListNode = $createListNode('ul');
        const listItem1 = $createListItemNode();
        const listItem2 = $createListItemNode();
        root.append(topListNode);
        topListNode.append(listItem1);
        topListNode.append(listItem2);
        const result = $isLastItemInList(listItem1);
        expect(result).toEqual(false);
      });
    });
  });
});
