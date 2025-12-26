/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$createOffsetView} from '@lexical/offset';
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isLineBreakNode,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  type ParagraphNode,
} from 'lexical';
import {initializeUnitTest} from 'lexical/src/__tests__/utils';

describe('LexicalOffset tests', () => {
  initializeUnitTest((testEnv) => {
    beforeEach(() => {
      testEnv.editor.update(() => {
        $getRoot()
          .clear()
          .append(
            $createParagraphNode().append(
              $createTextNode('abcde'),
              $createLineBreakNode(),
              $createTextNode('a'),
            ),
          );
      });
    });

    test('createSelectionFromOffsets does not create invalid selection (regression #7580)', () => {
      testEnv.editor.update(
        () => {
          $getSelection()?.insertRawText('abcdef\nabc');
        },
        {discrete: true},
      );

      testEnv.editor.read(() => {
        const offsetView = $createOffsetView(testEnv.editor);

        // offset=5 points to TextNode("abcde")
        const selectionAt5 = offsetView.createSelectionFromOffsets(5, 5);
        expect($isRangeSelection(selectionAt5)).toBe(true);
        expect($isTextNode(selectionAt5?.anchor.getNode())).toBe(true);
        expect(selectionAt5?.anchor.offset).toBe(5);
        expect($isTextNode(selectionAt5?.focus.getNode())).toBe(true);
        expect(selectionAt5?.focus.offset).toBe(5);

        // offset=6 points to LineBreakNode()
        const selectionAt6 = offsetView.createSelectionFromOffsets(6, 6);
        expect($isRangeSelection(selectionAt6)).toBe(true);
        expect($isParagraphNode(selectionAt6?.anchor.getNode())).toBe(true);
        expect(selectionAt6?.anchor.offset).toBe(1);
        expect(
          $isLineBreakNode(
            // @ts-ignore
            (selectionAt6?.anchor.getNode() as ParagraphNode).getChildAtIndex(
              1,
            ),
          ),
        ).toBe(true);
        expect($isParagraphNode(selectionAt6?.focus.getNode())).toBe(true);
        expect(selectionAt6?.focus.offset).toBe(1);
        expect(
          $isLineBreakNode(
            // @ts-ignore
            (selectionAt6?.focus.getNode() as ParagraphNode).getChildAtIndex(1),
          ),
        ).toBe(true);
      });
    });
  });
});
