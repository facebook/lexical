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
  MOVE_TO_START,
} from 'lexical';
import {
  $createTestDecoratorNode,
  TestDecoratorNode,
} from 'lexical/src/__tests__/utils';
import {assert, describe, expect, test} from 'vitest';

function dispatchMoveToStart(editor: LexicalEditor, shiftKey: boolean) {
  editor.dispatchCommand(
    MOVE_TO_START,
    new KeyboardEvent('keydown', {ctrlKey: true, key: 'ArrowLeft', shiftKey}),
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

describe('MOVE_TO_START on a leading inline DecoratorNode (Issue #8555)', () => {
  test('Cmd+ArrowLeft from text caret moves caret before the inline decorator', () => {
    using editor = buildEditorFromExtensions({
      $initialEditorState: () => {
        const decorator = $createTestDecoratorNode().setIsInline(true);
        const text = $createTextNode('hello');
        const paragraph = $createParagraphNode().append(decorator, text);
        $getRoot().clear().append(paragraph);
        text.select(3, 3);
      },
      dependencies: [RichTextExtension],
      name: 'test',
      nodes: [TestDecoratorNode],
    });

    dispatchMoveToStart(editor, false);

    editor.read(() => {
      const selection = $getSelection();
      assert($isRangeSelection(selection));
      expect(selection.isCollapsed()).toBe(true);
      expect(selection.anchor.type).toBe('element');
      expect(selection.anchor.offset).toBe(0);
    });
  });

  test('Shift+Cmd+ArrowLeft selects from text caret back to element start', () => {
    using editor = buildEditorFromExtensions({
      $initialEditorState: () => {
        const decorator = $createTestDecoratorNode().setIsInline(true);
        const text = $createTextNode('hello');
        const paragraph = $createParagraphNode().append(decorator, text);
        $getRoot().clear().append(paragraph);
        text.select(5, 5);
      },
      dependencies: [RichTextExtension],
      name: 'test',
      nodes: [TestDecoratorNode],
    });

    dispatchMoveToStart(editor, true);

    editor.read(() => {
      const selection = $getSelection();
      assert($isRangeSelection(selection));
      expect(selection.isCollapsed()).toBe(false);
      expect(selection.anchor.type).toBe('text');
      expect(selection.anchor.offset).toBe(5);
      expect(selection.focus.type).toBe('element');
      expect(selection.focus.offset).toBe(0);
    });
  });

  test('Same fix applies inside HeadingNode', () => {
    using editor = buildEditorFromExtensions({
      $initialEditorState: () => {
        const decorator = $createTestDecoratorNode().setIsInline(true);
        const text = $createTextNode('world');
        const heading = $createHeadingNode('h1').append(decorator, text);
        $getRoot().clear().append(heading);
        text.select(2, 2);
      },
      dependencies: [RichTextExtension],
      name: 'test',
      nodes: [TestDecoratorNode],
    });

    dispatchMoveToStart(editor, false);

    editor.read(() => {
      const selection = $getSelection();
      assert($isRangeSelection(selection));
      expect(selection.isCollapsed()).toBe(true);
      expect(selection.anchor.type).toBe('element');
      expect(selection.anchor.offset).toBe(0);
    });
  });
});

describe('MOVE_TO_START no-op cases (Issue #8555)', () => {
  test.for([
    {
      label: 'first child is text, not a decorator',
      setup: () => {
        const text = $createTextNode('plain');
        const paragraph = $createParagraphNode().append(text);
        $getRoot().clear().append(paragraph);
        text.select(3, 3);
      },
    },
    {
      label: 'first child is a block (non-inline) decorator',
      setup: () => {
        const decorator = $createTestDecoratorNode().setIsInline(false);
        const text = $createTextNode('after');
        const paragraph = $createParagraphNode().append(decorator, text);
        $getRoot().clear().append(paragraph);
        text.select(2, 2);
      },
    },
    {
      label: 'caret already at element offset 0',
      setup: () => {
        const decorator = $createTestDecoratorNode().setIsInline(true);
        const text = $createTextNode('hello');
        const paragraph = $createParagraphNode().append(decorator, text);
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

    // Same selection-unchanged expectation for Cmd+Arrow and
    // Shift+Cmd+Arrow — the handler's guards don't branch on
    // shiftKey, and the matcher accepts either, so both should
    // fall through to native browser behavior.
    const beforeNoShift = snapshotSelection(editor);
    dispatchMoveToStart(editor, false);
    expect(snapshotSelection(editor)).toEqual(beforeNoShift);

    const beforeWithShift = snapshotSelection(editor);
    dispatchMoveToStart(editor, true);
    expect(snapshotSelection(editor)).toEqual(beforeWithShift);
  });
});

describe('MOVE_TO_START decorator-only element (no selectable text)', () => {
  test('Cmd+ArrowLeft moves caret before the decorator', () => {
    using editor = buildEditorFromExtensions({
      $initialEditorState: () => {
        const decorator = $createTestDecoratorNode().setIsInline(true);
        const paragraph = $createParagraphNode().append(decorator);
        $getRoot().clear().append(paragraph);
        paragraph.select(1, 1);
      },
      dependencies: [RichTextExtension],
      name: 'test',
      nodes: [TestDecoratorNode],
    });

    expect(() => dispatchMoveToStart(editor, false)).not.toThrow();

    editor.read(() => {
      const selection = $getSelection();
      assert($isRangeSelection(selection));
      expect(selection.isCollapsed()).toBe(true);
      expect(selection.anchor.type).toBe('element');
      expect(selection.anchor.offset).toBe(0);
    });
  });

  test('Shift+Cmd+ArrowLeft extends selection over the decorator', () => {
    using editor = buildEditorFromExtensions({
      $initialEditorState: () => {
        const decorator = $createTestDecoratorNode().setIsInline(true);
        const paragraph = $createParagraphNode().append(decorator);
        $getRoot().clear().append(paragraph);
        paragraph.select(1, 1);
      },
      dependencies: [RichTextExtension],
      name: 'test',
      nodes: [TestDecoratorNode],
    });

    expect(() => dispatchMoveToStart(editor, true)).not.toThrow();

    editor.read(() => {
      const selection = $getSelection();
      assert($isRangeSelection(selection));
      expect(selection.isCollapsed()).toBe(false);
      expect(selection.anchor.type).toBe('element');
      expect(selection.anchor.offset).toBe(1);
      expect(selection.focus.type).toBe('element');
      expect(selection.focus.offset).toBe(0);
    });
  });
});
