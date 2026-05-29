/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import {$createHeadingNode, RichTextExtension} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  LexicalEditor,
  MOVE_TO_END,
} from 'lexical';
import {
  $createTestDecoratorNode,
  TestDecoratorNode,
} from 'lexical/src/__tests__/utils';
import {assert, describe, expect, test} from 'vitest';

function dispatchMoveToEnd(editor: LexicalEditor, shiftKey: boolean) {
  editor.dispatchCommand(
    MOVE_TO_END,
    new KeyboardEvent('keydown', {ctrlKey: true, key: 'ArrowRight', shiftKey}),
  );
}

function snapshotSelection(editor: LexicalEditor) {
  return editor.read(() => {
    const s = $getSelection();
    if (!$isRangeSelection(s)) {
      return null;
    }
    return {
      anchor: [s.anchor.type, s.anchor.key, s.anchor.offset],
      focus: [s.focus.type, s.focus.key, s.focus.offset],
    };
  });
}

describe('MOVE_TO_END on a leading inline DecoratorNode (Issue #8555)', () => {
  test('Cmd+ArrowRight at offset 0 moves caret past the inline decorator', () => {
    using editor = buildEditorFromExtensions({
      $initialEditorState: () => {
        const decorator = $createTestDecoratorNode().setIsInline(true);
        const text = $createTextNode('hello');
        const paragraph = $createParagraphNode().append(decorator, text);
        $getRoot().clear().append(paragraph);
        paragraph.select(0, 0);
      },
      dependencies: [RichTextExtension],
      name: 'test',
      nodes: [TestDecoratorNode],
    });

    dispatchMoveToEnd(editor, false);

    editor.read(() => {
      const selection = $getSelection();
      assert($isRangeSelection(selection));
      expect(selection.isCollapsed()).toBe(true);
      expect(selection.focus.type).toBe('text');
      expect(selection.focus.offset).toBe('hello'.length);
    });
  });

  test('Shift+Cmd+ArrowRight at offset 0 selects to end of element', () => {
    using editor = buildEditorFromExtensions({
      $initialEditorState: () => {
        const decorator = $createTestDecoratorNode().setIsInline(true);
        const text = $createTextNode('hello');
        const paragraph = $createParagraphNode().append(decorator, text);
        $getRoot().clear().append(paragraph);
        paragraph.select(0, 0);
      },
      dependencies: [RichTextExtension],
      name: 'test',
      nodes: [TestDecoratorNode],
    });

    dispatchMoveToEnd(editor, true);

    editor.read(() => {
      const selection = $getSelection();
      assert($isRangeSelection(selection));
      expect(selection.isCollapsed()).toBe(false);
      expect(selection.anchor.type).toBe('element');
      expect(selection.anchor.offset).toBe(0);
      expect(selection.focus.offset).toBe('hello'.length);
    });
  });

  test('Same fix applies inside HeadingNode', () => {
    using editor = buildEditorFromExtensions({
      $initialEditorState: () => {
        const decorator = $createTestDecoratorNode().setIsInline(true);
        const text = $createTextNode('world');
        const heading = $createHeadingNode('h1').append(decorator, text);
        $getRoot().clear().append(heading);
        heading.select(0, 0);
      },
      dependencies: [RichTextExtension],
      name: 'test',
      nodes: [TestDecoratorNode],
    });

    dispatchMoveToEnd(editor, false);

    editor.read(() => {
      const selection = $getSelection();
      assert($isRangeSelection(selection));
      expect(selection.isCollapsed()).toBe(true);
      expect(selection.focus.offset).toBe('world'.length);
    });
  });
});

describe('MOVE_TO_END no-op cases (Issue #8555)', () => {
  test.for([
    {
      label: 'first child is text, not a decorator',
      setup: () => {
        const text = $createTextNode('plain');
        const paragraph = $createParagraphNode().append(text);
        $getRoot().clear().append(paragraph);
        paragraph.select(0, 0);
      },
    },
    {
      label: 'first child is a block (non-inline) decorator',
      setup: () => {
        const decorator = $createTestDecoratorNode().setIsInline(false);
        const text = $createTextNode('after');
        const paragraph = $createParagraphNode().append(decorator, text);
        $getRoot().clear().append(paragraph);
        paragraph.select(0, 0);
      },
    },
    {
      label: 'caret is past offset 0',
      setup: () => {
        const decorator = $createTestDecoratorNode().setIsInline(true);
        const text = $createTextNode('hello');
        const paragraph = $createParagraphNode().append(decorator, text);
        $getRoot().clear().append(paragraph);
        paragraph.select(1, 1);
      },
    },
    {
      label: 'decorator-only element (no selectable text)',
      setup: () => {
        const decorator = $createTestDecoratorNode().setIsInline(true);
        const paragraph = $createParagraphNode().append(decorator);
        $getRoot().clear().append(paragraph);
        paragraph.select(0, 0);
      },
    },
  ])('no-op: $label', ({setup}) => {
    using editor = buildEditorFromExtensions({
      $initialEditorState: setup,
      dependencies: [RichTextExtension],
      name: 'test',
      nodes: [TestDecoratorNode],
    });

    const before = snapshotSelection(editor);

    dispatchMoveToEnd(editor, false);

    expect(snapshotSelection(editor)).toEqual(before);
  });
});

describe('MOVE_TO_END decorator-only safety (crash fix)', () => {
  test('Cmd+ArrowRight on decorator-only element does not throw', () => {
    using editor = buildEditorFromExtensions({
      $initialEditorState: () => {
        const decorator = $createTestDecoratorNode().setIsInline(true);
        const paragraph = $createParagraphNode().append(decorator);
        $getRoot().clear().append(paragraph);
        paragraph.select(0, 0);
      },
      dependencies: [RichTextExtension],
      name: 'test',
      nodes: [TestDecoratorNode],
    });

    // Should not throw — previously this would crash with selectEnd() on empty element
    expect(() => dispatchMoveToEnd(editor, false)).not.toThrow();

    editor.read(() => {
      const selection = $getSelection();
      assert($isRangeSelection(selection));
      // Selection remains valid
      expect(selection.anchor.type).toBeDefined();
    });
  });

  test('Shift+Cmd+ArrowRight on decorator-only element does not throw', () => {
    using editor = buildEditorFromExtensions({
      $initialEditorState: () => {
        const decorator = $createTestDecoratorNode().setIsInline(true);
        const paragraph = $createParagraphNode().append(decorator);
        $getRoot().clear().append(paragraph);
        paragraph.select(0, 0);
      },
      dependencies: [RichTextExtension],
      name: 'test',
      nodes: [TestDecoratorNode],
    });

    const before = snapshotSelection(editor);

    // Handler bails safely on decorator-only elements (no selectable text)
    dispatchMoveToEnd(editor, true);

    // Selection unchanged — handler returned false
    expect(snapshotSelection(editor)).toEqual(before);
  });
});
