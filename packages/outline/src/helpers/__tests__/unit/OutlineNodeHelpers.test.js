/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineEditor, View, NodeKey, OutlineNode} from 'outline';

import {
  initializeUnitTest,
  createTestBlockNode,
} from '../../../__tests__/utils';
import {dfs} from '../../OutlineNodeHelpers';
import {createParagraphNode, isParagraphNode} from 'outline/ParagraphNode';
import {createTextNode} from 'outline';

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
      await editor.update((view: View) => {
        const root = view.getRoot();
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
        root.append(paragraph1);
        root.append(paragraph2);
        paragraph1.append(block1);
        paragraph1.append(block2);
        paragraph2.append(text4);
        paragraph2.append(text5);
        text5.toggleBold(); // Prevent from merging with text 4
        paragraph2.append(block3);
        block1.append(text1);
        block2.append(text2);
        block2.append(text3);
        text3.toggleBold(); // Prevent from merging with text2
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
      await editor.update((view: View) => {
        const root = view.getRoot();
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
      await editor.update((view: View) => {
        const root = view.getRoot();
        const paragraph1 = createParagraphNode();
        const block1 = createTestBlockNode();
        const block2 = createTestBlockNode();
        const block3 = createTestBlockNode();
        root.append(paragraph1);
        paragraph1.append(block1);
        paragraph1.append(block2);
        paragraph1.append(block3);

        expectedKeys = [root.getKey(), paragraph1.getKey(), block3.getKey()];
      });

      const dfsKeys = [];
      await editor.update((view: View) => {
        const root = view.getRoot();
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
  });
});
