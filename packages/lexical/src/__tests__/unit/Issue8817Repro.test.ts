/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {$patchStyleText} from '@lexical/selection';
import {
  $createParagraphNode,
  $createRangeSelection,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $setSelection,
  type TextNode,
} from 'lexical';
import {initializeUnitTest, invariant} from 'lexical/src/__tests__/utils';
import {describe, expect, test} from 'vitest';

/**
 * Builds `<p>Hello</p><p>World</p>` and returns both text nodes. "Hello" is
 * always left plain so it can stand in for an unformatted destination.
 */
function $setUpTwoParagraphs(): {first: TextNode; second: TextNode} {
  const root = $getRoot();
  root.clear();
  const firstParagraph = $createParagraphNode();
  const first = $createTextNode('Hello');
  firstParagraph.append(first);
  const secondParagraph = $createParagraphNode();
  const second = $createTextNode('World');
  secondParagraph.append(second);
  root.append(firstParagraph, secondParagraph);
  return {first, second};
}

/** Places a collapsed caret at `offset` inside `node`, with no format/style. */
function $placeFreshCaret(node: TextNode, offset: number): void {
  const selection = $createRangeSelection();
  selection.anchor.set(node.getKey(), offset, 'text');
  selection.focus.set(node.getKey(), offset, 'text');
  $setSelection(selection);
}

describe('Programmatically moving a Selection updates format and style (#8817)', () => {
  initializeUnitTest(testEnv => {
    test('selectStart() drops the format of the old position', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const {second} = $setUpTwoParagraphs();
        $placeFreshCaret(second, 0);
        const selection = $getSelection();
        invariant($isRangeSelection(selection), 'Expected RangeSelection');
        selection.focus.set(
          second.getKey(),
          second.getTextContentSize(),
          'text',
        );
        selection.formatText('bold');
        expect(selection.hasFormat('bold')).toBe(true);
      });

      await editor.update(() => {
        // Move the caret to the start of the (plain) first paragraph.
        $getRoot().selectStart();
      });

      editor.read(() => {
        const selection = $getSelection();
        invariant($isRangeSelection(selection), 'Expected RangeSelection');
        // "Hello" is not bold, so neither is a caret sitting inside it.
        expect(selection.hasFormat('bold')).toBe(false);
      });
    });

    test('selectEnd() picks up the format of the new position', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const {first, second} = $setUpTwoParagraphs();
        second.setFormat('bold');
        // A fresh caret in the plain first paragraph: format starts at 0.
        $placeFreshCaret(first, 0);
      });

      await editor.update(() => {
        // Move it into the bold second paragraph.
        $getRoot().selectEnd();
      });

      editor.read(() => {
        const selection = $getSelection();
        invariant($isRangeSelection(selection), 'Expected RangeSelection');
        expect(selection.hasFormat('bold')).toBe(true);
      });
    });

    test('selectStart() drops the style of the old position', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const {second} = $setUpTwoParagraphs();
        // A collapsed caret is what arms selection.style for the next
        // insertion, which is the value the report observes.
        $placeFreshCaret(second, second.getTextContentSize());
        const selection = $getSelection();
        invariant($isRangeSelection(selection), 'Expected RangeSelection');
        $patchStyleText(selection, {color: 'rgb(255, 0, 0)'});
        expect(selection.style).toBe('color: rgb(255, 0, 0);');
      });

      await editor.update(() => {
        $getRoot().selectStart();
      });

      editor.read(() => {
        const selection = $getSelection();
        invariant($isRangeSelection(selection), 'Expected RangeSelection');
        // "Hello" carries no inline style.
        expect(selection.style).toBe('');
      });
    });

    test('selectEnd() picks up the style of the new position', async () => {
      const {editor} = testEnv;

      await editor.update(() => {
        const {first, second} = $setUpTwoParagraphs();
        second.setStyle('color: rgb(255, 0, 0);');
        $placeFreshCaret(first, 0);
      });

      await editor.update(() => {
        $getRoot().selectEnd();
      });

      editor.read(() => {
        const selection = $getSelection();
        invariant($isRangeSelection(selection), 'Expected RangeSelection');
        expect(selection.style).toBe('color: rgb(255, 0, 0);');
      });
    });

    // Controls: these must hold both before and after the fix.
    test('an armed format survives a move within the same node', async () => {
      const {editor} = testEnv;
      let text: TextNode;

      await editor.update(() => {
        const {first} = $setUpTwoParagraphs();
        text = first;
        $placeFreshCaret(first, 5);
        const selection = $getSelection();
        invariant($isRangeSelection(selection), 'Expected RangeSelection');
        // Toggling bold on a collapsed caret arms the format for the next
        // insertion even though the node itself is not bold.
        selection.formatText('bold');
        expect(selection.hasFormat('bold')).toBe(true);
      });

      await editor.update(() => {
        // Re-selecting the same node must not disarm it.
        text.select(5, 5);
      });

      editor.read(() => {
        const selection = $getSelection();
        invariant($isRangeSelection(selection), 'Expected RangeSelection');
        expect(selection.hasFormat('bold')).toBe(true);
      });
    });

    test('an armed style survives a move within the same node', async () => {
      const {editor} = testEnv;
      let text: TextNode;

      await editor.update(() => {
        const {first} = $setUpTwoParagraphs();
        text = first;
        $placeFreshCaret(first, 5);
        const selection = $getSelection();
        invariant($isRangeSelection(selection), 'Expected RangeSelection');
        $patchStyleText(selection, {color: 'rgb(0, 0, 255)'});
      });

      await editor.update(() => {
        text.select(5, 5);
      });

      editor.read(() => {
        const selection = $getSelection();
        invariant($isRangeSelection(selection), 'Expected RangeSelection');
        expect(selection.style).toBe('color: rgb(0, 0, 255);');
      });
    });
  });
});
