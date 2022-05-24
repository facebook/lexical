/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

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
  $isNodeSelection,
  LexicalEditor,
  NodeKey,
  ParagraphNode,
} from 'lexical';
import {initializeUnitTest} from 'lexical/src/__tests__/utils';

import {mergePrevious} from '../../shared/useCharacterLimit';

describe('LexicalNodeHelpers tests', () => {
  initializeUnitTest(
    (testEnv) => {
      describe('merge', () => {
        async function initializeEditorWithLeftRightOverflowNodes(): Promise<
          [NodeKey, NodeKey]
        > {
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
            const overflowLeft = $getNodeByKey<OverflowNode>(overflowLeftKey);
            const overflowRight = $getNodeByKey<OverflowNode>(overflowRightKey);

            const text1 = $createTextNode('1');
            const text2 = $createTextNode('2');

            overflowRight.append(text1, text2);

            text2.toggleFormat('bold'); // Prevent merging with text1

            overflowLeft.select();
          });

          await editor.update(() => {
            const paragraph = $getRoot().getFirstChild<ParagraphNode>();
            const overflowRight = $getNodeByKey<OverflowNode>(overflowRightKey);

            mergePrevious(overflowRight);

            expect(paragraph.getChildrenSize()).toBe(1);
            expect($isOverflowNode(paragraph.getFirstChild())).toBe(true);

            const selection = $getSelection();

            if (selection === null) {
              throw new Error('Lost selection');
            }

            if ($isNodeSelection(selection)) {
              return;
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
            const overflowLeft = $getNodeByKey<OverflowNode>(overflowLeftKey);
            const overflowRight = $getNodeByKey<OverflowNode>(overflowRightKey);

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
            const paragraph = $getRoot().getFirstChild<ParagraphNode>();

            const overflowRight = $getNodeByKey<OverflowNode>(overflowRightKey);

            mergePrevious(overflowRight);

            expect(paragraph.getChildrenSize()).toBe(1);
            expect($isOverflowNode(paragraph.getFirstChild())).toBe(true);

            const selection = $getSelection();

            if (selection === null) {
              throw new Error('Lost selection');
            }

            if ($isNodeSelection(selection)) {
              return;
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
            const overflowLeft = $getNodeByKey<OverflowNode>(overflowLeftKey);
            const overflowRight = $getNodeByKey<OverflowNode>(overflowRightKey);

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

            if ($isNodeSelection(selection)) {
              return;
            }

            selection.focus.set(overflowRightKey, 1, 'element');
          });

          await editor.update(() => {
            const paragraph = $getRoot().getFirstChild<ParagraphNode>();
            const overflowRight = $getNodeByKey<OverflowNode>(overflowRightKey);

            mergePrevious(overflowRight);

            expect(paragraph.getChildrenSize()).toBe(1);
            expect($isOverflowNode(paragraph.getFirstChild())).toBe(true);

            const selection = $getSelection();

            if (selection === null) {
              throw new Error('Lost selection');
            }

            if ($isNodeSelection(selection)) {
              return;
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
      namespace: '',
      nodes: [OverflowNode],
      theme: {},
    },
  );
});
