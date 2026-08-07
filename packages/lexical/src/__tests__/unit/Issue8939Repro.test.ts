/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {buildEditorFromExtensions, defineExtension} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $needsBlockCursorBeside,
  type LexicalNode,
} from 'lexical';
import {assert, describe, expect, test} from 'vitest';

import {
  $createTestDecoratorNode,
  $createTestShadowRootNode,
  TestDecoratorNode,
  TestShadowRootNode,
} from '../utils';

const ext = defineExtension({
  dependencies: [RichTextExtension],
  name: '[8939]',
  nodes: [TestDecoratorNode, TestShadowRootNode],
});

function $blockDecorator(): LexicalNode {
  return $createTestDecoratorNode().setIsInline(false);
}

function $shadowRoot(label: string): LexicalNode {
  return $createTestShadowRootNode().append(
    $createParagraphNode().append($createTextNode(label)),
  );
}

// The block cursor is what Lexical renders when the selection is an element
// point directly beside a node that `$needsBlockCursorBeside`. There is no
// text position there, so Backspace/Delete can only mean "remove that node".
// That already worked for a block DecoratorNode, but a shadow-root
// ElementNode host (a table, or a slot-bearing card) was left untouched.
describe('block cursor deletion beside an ElementNode (#8939)', () => {
  test.for([
    {isBackward: true, kind: 'decorator' as const},
    {isBackward: false, kind: 'decorator' as const},
    {isBackward: true, kind: 'shadowRoot' as const},
    {isBackward: false, kind: 'shadowRoot' as const},
  ])(
    'deletes the adjacent $kind (isBackward: $isBackward)',
    ({kind, isBackward}) => {
      using editor = buildEditorFromExtensions(ext);
      const $make =
        kind === 'decorator' ? $blockDecorator : () => $shadowRoot('x');
      let keyA = '';
      let keyB = '';

      editor.update(
        () => {
          const a = $make();
          const b = $make();
          keyA = a.getKey();
          keyB = b.getKey();
          $getRoot().clear().append(a, b);
          // The block cursor position between the two nodes.
          $getRoot().select(1, 1);
        },
        {discrete: true},
      );

      editor.read(() => {
        // Both sides render a block cursor, so both must delete the same way.
        expect($needsBlockCursorBeside($getRoot().getChildAtIndex(0))).toBe(
          true,
        );
        expect($needsBlockCursorBeside($getRoot().getChildAtIndex(1))).toBe(
          true,
        );
      });

      editor.update(
        () => {
          const selection = $getSelection();
          assert($isRangeSelection(selection), 'Expected RangeSelection');
          selection.deleteCharacter(isBackward);
        },
        {discrete: true},
      );

      editor.read(() => {
        expect($getRoot().getChildrenSize()).toBe(1);
        // Backspace removes the node before the cursor, Delete the one after.
        expect($getRoot().getChildAtIndex(0)!.getKey()).toBe(
          isBackward ? keyB : keyA,
        );
      });
    },
  );

  test('Backspace after the last shadow root deletes it', () => {
    using editor = buildEditorFromExtensions(ext);

    editor.update(
      () => {
        $getRoot().clear().append($shadowRoot('A'), $shadowRoot('B'));
        $getRoot().select(2, 2);
      },
      {discrete: true},
    );

    editor.update(
      () => {
        const selection = $getSelection();
        assert($isRangeSelection(selection), 'Expected RangeSelection');
        selection.deleteCharacter(true);
      },
      {discrete: true},
    );

    editor.read(() => {
      expect($getRoot().getChildrenSize()).toBe(1);
      expect($getRoot().getTextContent()).toBe('A');
    });
  });

  // Guard the boundary of the new branch: an empty block whose caret merely
  // sits next to a shadow root is not a block cursor, so the existing
  // "remove the empty block, keep the shadow root" behaviour must survive.
  test('Backspace in an empty block after a shadow root removes the block, not the shadow root', () => {
    using editor = buildEditorFromExtensions(ext);

    editor.update(
      () => {
        const paragraph = $createParagraphNode();
        $getRoot().clear().append($shadowRoot('A'), paragraph);
        paragraph.select(0, 0);
      },
      {discrete: true},
    );

    editor.update(
      () => {
        const selection = $getSelection();
        assert($isRangeSelection(selection), 'Expected RangeSelection');
        selection.deleteCharacter(true);
      },
      {discrete: true},
    );

    editor.read(() => {
      expect($getRoot().getChildrenSize()).toBe(1);
      expect($getRoot().getTextContent()).toBe('A');
    });
  });

  // A plain paragraph never renders a block cursor, so it must not be
  // removed as a unit.
  test('a paragraph does not need a block cursor beside it', () => {
    using editor = buildEditorFromExtensions(ext);

    editor.update(
      () => {
        $getRoot()
          .clear()
          .append($createParagraphNode().append($createTextNode('A')));
      },
      {discrete: true},
    );

    editor.read(() => {
      expect($needsBlockCursorBeside($getRoot().getChildAtIndex(0))).toBe(
        false,
      );
    });
  });
});
