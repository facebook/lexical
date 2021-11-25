/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineEditor, NodeKey} from 'outline';

import {initializeUnitTest} from '../../../../outline/src/__tests__/utils';
import {createTextNode, getSelection, getNodeByKey, getRoot} from 'outline';
import {createParagraphNode} from 'outline/ParagraphNode';
import {
  createOverflowNode,
  mergePrevious,
  isOverflowNode,
  OverflowNode,
} from '../../useOutlineCharacterLimit';
import type {ParagraphNode} from '../../../../outline/src/extensions/OutlineParagraphNode';

describe('OutlineNodeHelpers tests', () => {
  initializeUnitTest((testEnv) => {
    beforeEach(() => {
      const {editor} = testEnv;
      editor.registerNodeType('overflow', OverflowNode);
    });

    describe('merge', () => {
      async function initializeEditorWithLeftRightOverflowNodes(): [
        NodeKey,
        NodeKey,
      ] {
        const editor: OutlineEditor = testEnv.editor;
        let overflowLeftKey;
        let overflowRightKey;
        await editor.update(() => {
          const root = getRoot();
          const paragraph = createParagraphNode();
          const overflowLeft = createOverflowNode();
          const overflowRight = createOverflowNode();
          overflowLeftKey = overflowLeft.getKey();
          overflowRightKey = overflowRight.getKey();
          root.append(paragraph);
          paragraph.append(overflowLeft);
          paragraph.append(overflowRight);
        });

        return [overflowLeftKey, overflowRightKey];
      }

      it('merges an empty overflow node (left overflow selected)', async () => {
        const editor: OutlineEditor = testEnv.editor;
        const [overflowLeftKey, overflowRightKey] =
          await initializeEditorWithLeftRightOverflowNodes();
        await editor.update(() => {
          const overflowLeft = getNodeByKey(overflowLeftKey);
          const overflowRight = getNodeByKey(overflowRightKey);
          const text1 = createTextNode('1');
          const text2 = createTextNode('2');
          overflowRight.append(text1, text2);
          text2.toggleFormat('bold'); // Prevent merging with text1

          overflowLeft.select();
        });
        await editor.update(() => {
          const paragraph: ParagraphNode = getRoot().getFirstChild();
          const overflowRight = getNodeByKey(overflowRightKey);
          mergePrevious(overflowRight);
          expect(paragraph.getChildrenSize()).toBe(1);
          expect(isOverflowNode(paragraph.getFirstChild())).toBe(true);
          const selection = getSelection();
          if (selection === null) {
            throw new Error('Lost selection');
          }
          expect(selection.anchor.key).toBe(overflowRightKey);
          expect(selection.anchor.offset).toBe(0);
          expect(selection.focus.key).toBe(overflowRightKey);
          expect(selection.anchor.offset).toBe(0);
        });
      });

      it('merges an overflow node (left overflow selected)', async () => {
        const editor: OutlineEditor = testEnv.editor;
        const [overflowLeftKey, overflowRightKey] =
          await initializeEditorWithLeftRightOverflowNodes();
        let text2Key: NodeKey;
        await editor.update(() => {
          const overflowLeft = getNodeByKey(overflowLeftKey);
          const overflowRight = getNodeByKey(overflowRightKey);
          const text1 = createTextNode('1');
          const text2 = createTextNode('2');
          const text3 = createTextNode('3');
          const text4 = createTextNode('4');
          text2Key = text2.getKey();
          overflowLeft.append(text1, text2);
          text2.toggleFormat('bold'); // Prevent merging with text1
          overflowRight.append(text3, text4);
          text4.toggleFormat('bold'); // Prevent merging with text3

          overflowLeft.select(1, 1);
        });
        await editor.update(() => {
          const paragraph: ParagraphNode = getRoot().getFirstChild();
          const overflowRight = getNodeByKey(overflowRightKey);
          mergePrevious(overflowRight);
          expect(paragraph.getChildrenSize()).toBe(1);
          expect(isOverflowNode(paragraph.getFirstChild())).toBe(true);
          const selection = getSelection();
          if (selection === null) {
            throw new Error('Lost selection');
          }
          expect(selection.anchor.key).toBe(text2Key);
          expect(selection.anchor.offset).toBe(0);
          expect(selection.focus.key).toBe(text2Key);
          expect(selection.anchor.offset).toBe(0);
        });
      });

      it('merges an overflow node (left-right overflow selected)', async () => {
        const editor: OutlineEditor = testEnv.editor;
        const [overflowLeftKey, overflowRightKey] =
          await initializeEditorWithLeftRightOverflowNodes();
        let text2Key: NodeKey;
        let text4Key: NodeKey;
        await editor.update(() => {
          const overflowLeft = getNodeByKey(overflowLeftKey);
          const overflowRight = getNodeByKey(overflowRightKey);
          const text1 = createTextNode('1');
          const text2 = createTextNode('2');
          const text3 = createTextNode('3');
          const text4 = createTextNode('4');
          text2Key = text2.getKey();
          text4Key = text4.getKey();
          overflowLeft.append(text1);
          overflowLeft.append(text2);
          text2.toggleFormat('bold'); // Prevent merging with text1
          overflowRight.append(text3);
          overflowRight.append(text4);
          text4.toggleFormat('bold'); // Prevent merging with text3

          overflowLeft.select(1, 1);
          const selection = getSelection();
          selection.focus.set(overflowRightKey, 1, 'block');
        });
        await editor.update(() => {
          const paragraph: ParagraphNode = getRoot().getFirstChild();
          const overflowRight = getNodeByKey(overflowRightKey);
          mergePrevious(overflowRight);
          expect(paragraph.getChildrenSize()).toBe(1);
          expect(isOverflowNode(paragraph.getFirstChild())).toBe(true);
          const selection = getSelection();
          if (selection === null) {
            throw new Error('Lost selection');
          }
          expect(selection.anchor.key).toBe(text2Key);
          expect(selection.anchor.offset).toBe(0);
          expect(selection.focus.key).toBe(text4Key);
          expect(selection.anchor.offset).toBe(0);
        });
      });
    });
  });
});
