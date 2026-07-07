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
  $isParagraphNode,
  $isRangeSelection,
  $setSlot,
  type LexicalEditor,
  type NodeKey,
} from 'lexical';
import {
  $assertNodeType,
  $createTestDecoratorNode,
  initializeUnitTest,
} from 'lexical/src/__tests__/utils';
import {describe, expect, it} from 'vitest';

import {
  $mergePrevious,
  $wrapOverflowedNodes,
} from '../../shared/useCharacterLimit';

describe('LexicalNodeHelpers tests', () => {
  initializeUnitTest(
    testEnv => {
      describe('merge', () => {
        function $initializeEditorWithLeftRightOverflowNodes(): [
          NodeKey,
          NodeKey,
        ] {
          const root = $getRoot();

          const paragraph = $createParagraphNode();
          const overflowLeft = $createOverflowNode();
          const overflowRight = $createOverflowNode();

          root.append(paragraph);

          paragraph.append(overflowLeft);
          paragraph.append(overflowRight);

          return [overflowLeft.getKey(), overflowRight.getKey()];
        }

        it('merges an overflow node (left overflow selected)', async () => {
          const editor: LexicalEditor = testEnv.editor;
          let overflowLeftKey: NodeKey;
          let overflowRightKey: NodeKey;

          let text1Key: NodeKey;

          await editor.update(() => {
            [overflowLeftKey, overflowRightKey] =
              $initializeEditorWithLeftRightOverflowNodes();

            const overflowLeft = $assertNodeType(
              $getNodeByKey(overflowLeftKey),
              $isOverflowNode,
            );
            const overflowRight = $assertNodeType(
              $getNodeByKey(overflowRightKey),
              $isOverflowNode,
            );

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
            const paragraph = $assertNodeType(
              $getRoot().getFirstChild(),
              $isParagraphNode,
            );

            const overflowRight = $assertNodeType(
              $getNodeByKey(overflowRightKey),
              $isOverflowNode,
            );

            $mergePrevious(overflowRight);

            expect(paragraph.getChildrenSize()).toBe(1);
            expect($isOverflowNode(paragraph.getFirstChild())).toBe(true);

            const selection = $getSelection();

            if (!$isRangeSelection(selection)) {
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
          let overflowLeftKey: NodeKey;
          let overflowRightKey: NodeKey;

          let text2Key: NodeKey;
          let text3Key: NodeKey;

          await editor.update(() => {
            [overflowLeftKey, overflowRightKey] =
              $initializeEditorWithLeftRightOverflowNodes();
            const overflowLeft = $assertNodeType(
              $getNodeByKey(overflowLeftKey),
              $isOverflowNode,
            );
            const overflowRight = $assertNodeType(
              $getNodeByKey(overflowRightKey),
              $isOverflowNode,
            );

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

            if (!$isRangeSelection(selection)) {
              return;
            }

            selection.focus.set(overflowRightKey, 1, 'element');
          });

          await editor.update(() => {
            const paragraph = $assertNodeType(
              $getRoot().getFirstChild(),
              $isParagraphNode,
            );
            const overflowRight = $assertNodeType(
              $getNodeByKey(overflowRightKey),
              $isOverflowNode,
            );

            $mergePrevious(overflowRight);

            expect(paragraph.getChildrenSize()).toBe(1);
            expect($isOverflowNode(paragraph.getFirstChild())).toBe(true);

            const selection = $getSelection();

            if (!$isRangeSelection(selection)) {
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

      describe('$wrapOverflowedNodes', () => {
        // A text-bearing non-inline decorator slotted into a host is skipped
        // by the wrap loop (replacing it with an OverflowNode would throw),
        // but its text is part of the root text content that funds `offset`
        // — the budget must advance past it or every later wrap boundary
        // lands late by the decorator's size.
        it('advances the budget past a slotted decorator so the wrap boundary is exact', async () => {
          const editor: LexicalEditor = testEnv.editor;
          let hostKey: NodeKey;

          await editor.update(() => {
            const host = $createParagraphNode();
            hostKey = host.getKey();
            host.append($createTextNode('12345'));
            $getRoot().append(host);
            // TestDecoratorNode.getTextContent() === 'Hello world' (11
            // chars); slots-first dfs counts it ahead of the host's text.
            $setSlot(
              host,
              'media',
              $createTestDecoratorNode().setIsInline(false),
            );
          });

          await editor.update(() => {
            // Budget: 11 (slotted decorator) + 2 ('12') = 13; '345' is over.
            $wrapOverflowedNodes(13);
          });

          editor.read(() => {
            const host = $assertNodeType(
              $getNodeByKey(hostKey),
              $isParagraphNode,
            );
            const [kept, overflow] = host.getChildren();
            expect(kept.getTextContent()).toBe('12');
            $assertNodeType(overflow, $isOverflowNode);
            expect(overflow.getTextContent()).toBe('345');
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
