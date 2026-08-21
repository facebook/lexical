/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import invariant from '@lexical/internal/invariant';
import {bench, describe} from 'vitest';

import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $insertNodes,
  $isParagraphNode,
  $isRangeSelection,
  $isTextNode,
  $selectAll,
  type LexicalEditor,
} from '../../';
import {createTestEditor} from '../../__tests__/utils';
import {attachToDOM, buildLargeDoc} from './_utils';

const SPLIT_TEXT = 'paragraph with some text content for splitting';
const MIN_SPLIT_TEXT_LENGTH = 2;

const SIZES = [100, 1000] as const;

for (const size of SIZES) {
  // Splits last child at midpoint. Resets text when exhausted (~every
  // 5 iters) to avoid O(n) backward walk that would dominate timing.
  describe(`size=${size} :: split paragraph (Enter)`, () => {
    let editor: LexicalEditor;

    bench(
      'insertParagraph',
      () => {
        editor.update(
          () => {
            const last = $getRoot().getLastChild();
            invariant(
              last !== null && $isParagraphNode(last),
              'Expected ParagraphNode',
            );
            const textNode = last.getFirstChild();
            invariant($isTextNode(textNode), 'Expected TextNode');
            if (textNode.getTextContentSize() <= MIN_SPLIT_TEXT_LENGTH) {
              textNode.setTextContent(SPLIT_TEXT);
            }
            const splitOffset = Math.floor(textNode.getTextContentSize() / 2);
            textNode.select(splitOffset, splitOffset);
            const selection = $getSelection();
            invariant($isRangeSelection(selection), 'Expected RangeSelection');
            selection.insertParagraph();
          },
          {discrete: true},
        );
      },
      {
        setup: () => {
          editor = createTestEditor();
          attachToDOM(editor);
          buildLargeDoc(editor, size);
        },
      },
    );
  });

  // Non-destructive: bold toggles on the same paragraph each iteration.
  // Selection + format in one discrete update so reconcile is measured.
  describe(`size=${size} :: format text (bold on selection)`, () => {
    let editor: LexicalEditor;

    bench(
      'formatText bold',
      () => {
        editor.update(
          () => {
            const last = $getRoot().getLastChild();
            invariant(
              last !== null && $isParagraphNode(last),
              'Expected ParagraphNode',
            );
            const textNode = last.getFirstChild();
            invariant($isTextNode(textNode), 'Expected TextNode');
            textNode.select(0, textNode.getTextContentSize());
            const selection = $getSelection();
            invariant($isRangeSelection(selection), 'Expected RangeSelection');
            selection.formatText('bold');
          },
          {discrete: true},
        );
      },
      {
        setup: () => {
          editor = createTestEditor();
          attachToDOM(editor);
          buildLargeDoc(editor, size);
        },
      },
    );
  });

  // Destructive: selects the last 10 paragraphs and deletes via
  // removeText — the same code path as a user pressing Delete.
  // Anchors at the end of the paragraph before the range so that
  // after deletion the anchor paragraph keeps its text, avoiding
  // the empty-paragraph artifact that a start-of-range anchor causes.
  describe(`size=${size} :: delete range (10 paragraphs)`, () => {
    let editor: LexicalEditor;

    bench(
      'removeText across 10 paragraphs',
      () => {
        editor.update(
          () => {
            const root = $getRoot();
            invariant(
              root.getChildrenSize() > 10,
              'Document exhausted (%s children remain)',
              String(root.getChildrenSize()),
            );
            const lastNode = root.getLastChild();
            invariant(
              lastNode !== null && $isParagraphNode(lastNode),
              'Expected last ParagraphNode',
            );
            let firstToDelete = lastNode;
            for (let i = 0; i < 9; i++) {
              const prev = firstToDelete.getPreviousSibling();
              invariant(prev !== null, 'Expected previous sibling');
              firstToDelete = prev;
            }
            const anchorNode = firstToDelete.getPreviousSibling();
            invariant(
              anchorNode !== null && $isParagraphNode(anchorNode),
              'Expected anchor ParagraphNode',
            );
            const anchorText = anchorNode.getLastChild();
            invariant($isTextNode(anchorText), 'Expected anchor TextNode');
            const focusText = lastNode.getLastChild();
            invariant($isTextNode(focusText), 'Expected focus TextNode');
            anchorText.select(
              anchorText.getTextContentSize(),
              anchorText.getTextContentSize(),
            );
            const selection = $getSelection();
            invariant($isRangeSelection(selection), 'Expected RangeSelection');
            selection.focus.set(
              focusText.getKey(),
              focusText.getTextContentSize(),
              'text',
            );
            selection.removeText();
          },
          {discrete: true},
        );
      },
      {
        iterations: size,
        setup: () => {
          editor = createTestEditor();
          attachToDOM(editor);
          buildLargeDoc(editor, size * 16);
        },
        time: 0,
        warmupIterations: 5,
        warmupTime: 0,
      },
    );
  });

  // Accumulative: inserts 10 paragraphs at the end per iteration.
  describe(`size=${size} :: paste 10 paragraphs`, () => {
    let editor: LexicalEditor;
    let cycle = 0;

    bench(
      '$insertNodes at end',
      () => {
        editor.update(
          () => {
            const last = $getRoot().getLastChild();
            invariant(
              last !== null && $isParagraphNode(last),
              'Expected ParagraphNode',
            );
            const textNode = last.getFirstChild();
            invariant($isTextNode(textNode), 'Expected TextNode');
            textNode.select(
              textNode.getTextContentSize(),
              textNode.getTextContentSize(),
            );
            const nodes = [];
            for (let i = 0; i < 10; i++) {
              nodes.push(
                $createParagraphNode().append(
                  $createTextNode(`paste-${cycle}-${i}`),
                ),
              );
            }
            $insertNodes(nodes);
            cycle++;
          },
          {discrete: true},
        );
      },
      {
        setup: () => {
          editor = createTestEditor();
          attachToDOM(editor);
          buildLargeDoc(editor, size);
          cycle = 0;
        },
      },
    );
  });

  // Non-destructive: select all + italic toggle.
  describe(`size=${size} :: select all + format`, () => {
    let editor: LexicalEditor;

    bench(
      '$selectAll + formatText italic',
      () => {
        editor.update(
          () => {
            $selectAll();
            const selection = $getSelection();
            invariant($isRangeSelection(selection), 'Expected RangeSelection');
            selection.formatText('italic');
          },
          {discrete: true},
        );
      },
      {
        setup: () => {
          editor = createTestEditor();
          attachToDOM(editor);
          buildLargeDoc(editor, size);
        },
      },
    );
  });
}
