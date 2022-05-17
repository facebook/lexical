/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalEditor, NodeKey} from 'lexical';

import {
  $createOverflowNode,
  $isOverflowNode,
  OverflowNode,
} from '@lexical/overflow';
import {
  $createParagraphNode,
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
} from 'lexical';
import {initializeUnitTest} from 'lexical/src/__tests__/utils';

import {mergePrevious} from '../../DEPRECATED_useLexicalCharacterLimit';

// No idea why we suddenly need to do this, but it fixes the tests
// with latest experimental React version.
global.IS_REACT_ACT_ENVIRONMENT = true;

describe('LexicalNodeHelpers tests', () => {
  initializeUnitTest(
    (testEnv) => {
      describe('merge', () => {
        async function initializeEditorWithLeftRightOverflowNodes(): [
          NodeKey,
          NodeKey,
        ] {
          const editor: LexicalEditor = testEnv.editor;
          let overflowLeftKey;
          let overflowRightKey;
          await editor.update(() => {
            const root = $getRoot();
            const paragraph = $createParagraphNode();
            const overflowLeft = $createOverflowNode();
            const overflowRight = $createOverflowNode();
            overflowLeftKey = overflowLeft.getKey();
            overflowRightKey = overflowRight.getKey();
            root.append(paragraph);
            paragraph.append(overflowLeft);
            paragraph.append(overflowRight);
          });

          return [overflowLeftKey, overflowRightKey];
        }

        it('merges an empty overflow node (left overflow selected)', async () => {
          const editor: LexicalEditor = testEnv.editor;
          const [overflowLeftKey, overflowRightKey] =
            await initializeEditorWithLeftRightOverflowNodes();
          await editor.update(() => {
            const overflowLeft = $getNodeByKey(overflowLeftKey);
            const overflowRight = $getNodeByKey(overflowRightKey);
            const text1 = $createTextNode('1');
            const text2 = $createTextNode('2');
            overflowRight.append(text1, text2);
            text2.toggleFormat('bold'); // Prevent merging with text1

            overflowLeft.select();
          });
          await editor.update(() => {
            const paragraph: ParagraphNode = $getRoot().getFirstChild();
            const overflowRight = $getNodeByKey(overflowRightKey);
            mergePrevious(overflowRight);
            expect(paragraph.getChildrenSize()).toBe(1);
            expect($isOverflowNode(paragraph.getFirstChild())).toBe(true);
            const selection = $getSelection();
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
          const editor: LexicalEditor = testEnv.editor;
          const [overflowLeftKey, overflowRightKey] =
            await initializeEditorWithLeftRightOverflowNodes();
          let text1Key: NodeKey;
          await editor.update(() => {
            const overflowLeft = $getNodeByKey(overflowLeftKey);
            const overflowRight = $getNodeByKey(overflowRightKey);
            const text1 = $createTextNode('1');
            const text2 = $createTextNode('2');
            const text3 = $createTextNode('3');
            const text4 = $createTextNode('4');
            text1Key = text1.getKey();
            overflowLeft.append(text1, text2);
            text2.toggleFormat('bold'); // Prevent merging with text1
            overflowRight.append(text3, text4);
            text4.toggleFormat('bold'); // Prevent merging with text3

            overflowLeft.select(1, 1);
          });
          await editor.update(() => {
            const paragraph: ParagraphNode = $getRoot().getFirstChild();
            const overflowRight = $getNodeByKey(overflowRightKey);
            mergePrevious(overflowRight);
            expect(paragraph.getChildrenSize()).toBe(1);
            expect($isOverflowNode(paragraph.getFirstChild())).toBe(true);
            const selection = $getSelection();
            if (selection === null) {
              throw new Error('Lost selection');
            }
            expect(selection.anchor.key).toBe(text1Key);
            expect(selection.anchor.offset).toBe(1);
            expect(selection.focus.key).toBe(text1Key);
            expect(selection.anchor.offset).toBe(1);
          });
        });

        it('merges an overflow node (left-right overflow selected)', async () => {
          const editor: LexicalEditor = testEnv.editor;
          const [overflowLeftKey, overflowRightKey] =
            await initializeEditorWithLeftRightOverflowNodes();
          let text2Key: NodeKey;
          let text3Key: NodeKey;
          await editor.update(() => {
            const overflowLeft = $getNodeByKey(overflowLeftKey);
            const overflowRight = $getNodeByKey(overflowRightKey);
            const text1 = $createTextNode('1');
            const text2 = $createTextNode('2');
            const text3 = $createTextNode('3');
            const text4 = $createTextNode('4');
            text2Key = text2.getKey();
            text3Key = text3.getKey();
            overflowLeft.append(text1);
            overflowLeft.append(text2);
            text2.toggleFormat('bold'); // Prevent merging with text1
            overflowRight.append(text3);
            overflowRight.append(text4);
            text4.toggleFormat('bold'); // Prevent merging with text3

            overflowLeft.select(1, 1);
            const selection = $getSelection();
            selection.focus.set(overflowRightKey, 1, 'block');
          });
          await editor.update(() => {
            const paragraph: ParagraphNode = $getRoot().getFirstChild();
            const overflowRight = $getNodeByKey(overflowRightKey);
            mergePrevious(overflowRight);
            expect(paragraph.getChildrenSize()).toBe(1);
            expect($isOverflowNode(paragraph.getFirstChild())).toBe(true);
            const selection = $getSelection();
            if (selection === null) {
              throw new Error('Lost selection');
            }
            expect(selection.anchor.key).toBe(text2Key);
            expect(selection.anchor.offset).toBe(0);
            expect(selection.focus.key).toBe(text3Key);
            expect(selection.focus.offset).toBe(1);
          });
        });
      });
    },
    {
      nodes: [OverflowNode],
    },
  );
});
