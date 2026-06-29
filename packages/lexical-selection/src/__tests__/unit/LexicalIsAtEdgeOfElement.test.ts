/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$createLinkNode} from '@lexical/link';
import {$isAtEdgeOfElement} from '@lexical/selection';
import {
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getRoot,
  type ElementNode,
  type LexicalNode,
  type Point,
} from 'lexical';
import {createTestEditor} from 'lexical/src/__tests__/utils';
import {describe, expect, test} from 'vitest';

function $pointAt(
  node: LexicalNode,
  offset: number,
  type: 'text' | 'element',
): Point {
  const selection = $createRangeSelection();
  selection.anchor.set(node.getKey(), offset, type);
  return selection.anchor;
}

describe('$isAtEdgeOfElement', () => {
  test('text point at the start/end of a block', async () => {
    const editor = createTestEditor();
    editor.update(
      () => {
        const block = $createParagraphNode();
        const text = $createTextNode('hello');
        $getRoot().append(block.append(text));

        // Start of the block.
        expect(
          $isAtEdgeOfElement($pointAt(text, 0, 'text'), block, 'previous'),
        ).toBe(true);
        expect(
          $isAtEdgeOfElement($pointAt(text, 0, 'text'), block, 'next'),
        ).toBe(false);
        // End of the block.
        expect(
          $isAtEdgeOfElement($pointAt(text, 5, 'text'), block, 'next'),
        ).toBe(true);
        expect(
          $isAtEdgeOfElement($pointAt(text, 5, 'text'), block, 'previous'),
        ).toBe(false);
        // Middle of the text is at neither edge.
        expect(
          $isAtEdgeOfElement($pointAt(text, 2, 'text'), block, 'previous'),
        ).toBe(false);
        expect(
          $isAtEdgeOfElement($pointAt(text, 2, 'text'), block, 'next'),
        ).toBe(false);
      },
      {discrete: true},
    );
  });

  test('a sibling between the point and the edge disqualifies it', async () => {
    const editor = createTestEditor();
    editor.update(
      () => {
        const block = $createParagraphNode();
        const a = $createTextNode('a');
        const b = $createTextNode('b');
        $getRoot().append(block.append(a, b));

        // offset 0 of b is not the start (a precedes it).
        expect(
          $isAtEdgeOfElement($pointAt(b, 0, 'text'), block, 'previous'),
        ).toBe(false);
        // end of b is the end of the block.
        expect($isAtEdgeOfElement($pointAt(b, 1, 'text'), block, 'next')).toBe(
          true,
        );
        // end of a is not the end (b follows it).
        expect($isAtEdgeOfElement($pointAt(a, 1, 'text'), block, 'next')).toBe(
          false,
        );
        // start of a is the start of the block.
        expect(
          $isAtEdgeOfElement($pointAt(a, 0, 'text'), block, 'previous'),
        ).toBe(true);
      },
      {discrete: true},
    );
  });

  test('descends through nested inline elements', async () => {
    const editor = createTestEditor();
    editor.update(
      () => {
        const block = $createParagraphNode();
        const link = $createLinkNode('https://lexical.dev');
        const text = $createTextNode('link');
        $getRoot().append(block.append(link.append(text)));

        // The point is at the edge of both the inline link and the block.
        expect(
          $isAtEdgeOfElement($pointAt(text, 0, 'text'), block, 'previous'),
        ).toBe(true);
        expect(
          $isAtEdgeOfElement($pointAt(text, 0, 'text'), link, 'previous'),
        ).toBe(true);
        expect(
          $isAtEdgeOfElement($pointAt(text, 4, 'text'), block, 'next'),
        ).toBe(true);
        expect(
          $isAtEdgeOfElement($pointAt(text, 4, 'text'), link, 'next'),
        ).toBe(true);
      },
      {discrete: true},
    );
  });

  test('an empty element is at both of its edges', async () => {
    const editor = createTestEditor();
    editor.update(
      () => {
        const block = $createParagraphNode();
        $getRoot().append(block);

        // This is the geometric answer that backs $isAtStartOfNode /
        // $isAtEndOfNode; the block-aware $setBlocksType path layers an empty
        // guard on top of it.
        expect(
          $isAtEdgeOfElement($pointAt(block, 0, 'element'), block, 'previous'),
        ).toBe(true);
        expect(
          $isAtEdgeOfElement($pointAt(block, 0, 'element'), block, 'next'),
        ).toBe(true);
      },
      {discrete: true},
    );
  });

  test('element points at the leading/trailing child edge', async () => {
    const editor = createTestEditor();
    editor.update(
      () => {
        const block = $createParagraphNode();
        const a = $createTextNode('a');
        const b = $createTextNode('b');
        $getRoot().append(block.append(a, b));

        // Before the first child / after the last child.
        expect(
          $isAtEdgeOfElement($pointAt(block, 0, 'element'), block, 'previous'),
        ).toBe(true);
        expect(
          $isAtEdgeOfElement($pointAt(block, 2, 'element'), block, 'next'),
        ).toBe(true);
        // Between the two children is at neither edge.
        expect(
          $isAtEdgeOfElement($pointAt(block, 1, 'element'), block, 'previous'),
        ).toBe(false);
        expect(
          $isAtEdgeOfElement($pointAt(block, 1, 'element'), block, 'next'),
        ).toBe(false);
      },
      {discrete: true},
    );
  });

  test('a point outside the element is never at its edge', async () => {
    const editor = createTestEditor();
    editor.update(
      () => {
        const block1 = $createParagraphNode();
        const block2 = $createParagraphNode();
        const text1 = $createTextNode('one');
        const text2 = $createTextNode('two');
        $getRoot().append(block1.append(text1), block2.append(text2));

        const other: ElementNode = block2;
        expect(
          $isAtEdgeOfElement($pointAt(text1, 0, 'text'), other, 'previous'),
        ).toBe(false);
        expect(
          $isAtEdgeOfElement($pointAt(text1, 3, 'text'), other, 'next'),
        ).toBe(false);
      },
      {discrete: true},
    );
  });
});
