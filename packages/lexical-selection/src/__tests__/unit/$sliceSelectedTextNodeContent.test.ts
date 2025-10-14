/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$sliceSelectedTextNodeContent} from '@lexical/selection';
import {
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getNodeByKey,
  $getRoot,
} from 'lexical';
import {createTestEditor} from 'lexical/src/__tests__/utils';
import {describe, expect, test} from 'vitest';

// This primarily verifies that ephemeral TextNodes work correctly
describe('$sliceSelectedTextNodeContent', () => {
  function createInitializedEditor() {
    const editor = createTestEditor();
    editor.update(
      () => {
        $getRoot()
          .clear()
          .append(
            $createParagraphNode().append(
              $createTextNode('01234'),
              $createTextNode('56789').setFormat('bold'),
            ),
          );
      },
      {discrete: true},
    );
    return editor;
  }
  function $createTextSelection(start: number, end: number) {
    let i = 0;
    const selection = $createRangeSelection();
    for (const node of $getRoot().getAllTextNodes()) {
      const len = node.getTextContentSize();
      const j = i + len;
      if (start >= i && start <= j) {
        selection.anchor.set(node.getKey(), start - i, 'text');
      }
      if (end >= i && end <= j) {
        selection.focus.set(node.getKey(), end - i, 'text');
      }
      i = j;
    }
    return selection;
  }
  describe('clone', () => {
    test('does not clone with full selection (both nodes)', () => {
      const editor = createInitializedEditor();
      editor.read(() => {
        const textNodes = $getRoot().getAllTextNodes();
        const fullSize = textNodes.reduce(
          (acc, n) => acc + n.getTextContentSize(),
          0,
        );
        const selection = $createTextSelection(0, fullSize);
        for (const node of textNodes) {
          expect($sliceSelectedTextNodeContent(selection, node, 'clone')).toBe(
            node,
          );
        }
      });
    });
    test('clones only with partial selection (last node)', () => {
      const editor = createInitializedEditor();
      editor.read(() => {
        const textNodes = $getRoot().getAllTextNodes();
        const fullSize = textNodes.reduce(
          (acc, n) => acc + n.getTextContentSize(),
          0,
        );
        const selection = $createTextSelection(0, fullSize - 1);
        const lastNode = textNodes.at(-1);
        for (const node of textNodes) {
          const slice = $sliceSelectedTextNodeContent(selection, node, 'clone');
          if (node === lastNode) {
            expect(slice).not.toBe(node);
            expect(slice.getTextContent()).toBe(
              node.getTextContent().slice(0, -1),
            );
          } else {
            expect(slice).toBe(node);
          }
        }
      });
    });
    test('clones only with partial selection (first node)', () => {
      const editor = createInitializedEditor();
      editor.read(() => {
        const textNodes = $getRoot().getAllTextNodes();
        const fullSize = textNodes.reduce(
          (acc, n) => acc + n.getTextContentSize(),
          0,
        );
        const selection = $createTextSelection(1, fullSize);
        const firstNode = textNodes.at(0);
        for (const node of textNodes) {
          const slice = $sliceSelectedTextNodeContent(selection, node, 'clone');
          if (node === firstNode) {
            expect(slice).not.toBe(node);
            expect(slice.getTextContent()).toBe(node.getTextContent().slice(1));
          } else {
            expect(slice).toBe(node);
          }
        }
      });
    });
    test('can slice a node from both sides', () => {
      const editor = createInitializedEditor();
      editor.read(() => {
        const node = $getRoot().getAllTextNodes().at(0)!;
        const originalText = node.getTextContent();
        const selection = $createTextSelection(1, 3);
        const slice = $sliceSelectedTextNodeContent(selection, node, 'clone');
        expect(slice).not.toBe(node);
        expect(slice.getTextContent()).toBe(node.getTextContent().slice(1, 3));
        slice.setTextContent('different');
        // no side-effects are observed
        expect(node.getTextContent()).toBe(originalText);
        expect(slice.getTextContent()).toBe('different');
        expect($getNodeByKey(node.getKey())).toBe(node);
      });
    });
  });
});
