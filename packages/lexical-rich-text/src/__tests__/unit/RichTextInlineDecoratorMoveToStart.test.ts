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
  $createNodeSelection,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $setSelection,
  type LexicalEditor,
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

    const before = snapshotSelection(editor);

    dispatchMoveToStart(editor, false);

    expect(snapshotSelection(editor)).toEqual(before);
  });
});

describe('MOVE_TO_START with no leading text (Issue #8601)', () => {
  test('Cmd+ArrowLeft on decorator-only element moves caret to element offset 0', () => {
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

    dispatchMoveToStart(editor, false);

    editor.read(() => {
      const selection = $getSelection();
      assert($isRangeSelection(selection));
      const paragraph = $getRoot().getFirstChildOrThrow();
      expect(selection.isCollapsed()).toBe(true);
      expect(selection.anchor.type).toBe('element');
      expect(selection.anchor.key).toBe(paragraph.getKey());
      expect(selection.anchor.offset).toBe(0);
    });
  });

  test('Cmd+ArrowLeft from text caret inside [decorator][text][decorator] moves to element offset 0', () => {
    using editor = buildEditorFromExtensions({
      $initialEditorState: () => {
        const leading = $createTestDecoratorNode().setIsInline(true);
        const text = $createTextNode('hello');
        const trailing = $createTestDecoratorNode().setIsInline(true);
        const paragraph = $createParagraphNode().append(
          leading,
          text,
          trailing,
        );
        $getRoot().clear().append(paragraph);
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
      const paragraph = $getRoot().getFirstChildOrThrow();
      expect(selection.isCollapsed()).toBe(true);
      expect(selection.anchor.type).toBe('element');
      expect(selection.anchor.key).toBe(paragraph.getKey());
      expect(selection.anchor.offset).toBe(0);
    });
  });

  test('Shift+Cmd+ArrowLeft from text caret inside [decorator][text][decorator] selects back to element offset 0', () => {
    using editor = buildEditorFromExtensions({
      $initialEditorState: () => {
        const leading = $createTestDecoratorNode().setIsInline(true);
        const text = $createTextNode('hello');
        const trailing = $createTestDecoratorNode().setIsInline(true);
        const paragraph = $createParagraphNode().append(
          leading,
          text,
          trailing,
        );
        $getRoot().clear().append(paragraph);
        text.select(3, 3);
      },
      dependencies: [RichTextExtension],
      name: 'test',
      nodes: [TestDecoratorNode],
    });

    dispatchMoveToStart(editor, true);

    editor.read(() => {
      const selection = $getSelection();
      assert($isRangeSelection(selection));
      const paragraph = $getRoot().getFirstChildOrThrow();
      expect(selection.isCollapsed()).toBe(false);
      expect(selection.anchor.type).toBe('text');
      expect(selection.anchor.offset).toBe(3);
      expect(selection.focus.type).toBe('element');
      expect(selection.focus.key).toBe(paragraph.getKey());
      expect(selection.focus.offset).toBe(0);
    });
  });
});

describe('MOVE_TO_START on a NodeSelection (Issue #8604)', () => {
  test.for([
    {
      expected: () => {
        const paragraph = $getRoot().getFirstChildOrThrow();
        return {key: paragraph.getKey(), offset: 0};
      },
      label: 'single inline decorator collapses to the block start',
      setup: () => {
        const decorator = $createTestDecoratorNode().setIsInline(true);
        const text = $createTextNode('hello');
        const paragraph = $createParagraphNode().append(text, decorator);
        $getRoot().clear().append(paragraph);
        const ns = $createNodeSelection();
        ns.add(decorator.getKey());
        $setSelection(ns);
      },
    },
    {
      expected: () => {
        const firstParagraph = $getRoot().getFirstChildOrThrow();
        return {key: firstParagraph.getKey(), offset: 0};
      },
      label: 'multi-node selection picks the iteration-order first node',
      setup: () => {
        const firstDecorator = $createTestDecoratorNode().setIsInline(true);
        const firstText = $createTextNode('A');
        const firstParagraph = $createParagraphNode().append(
          firstText,
          firstDecorator,
        );
        const secondDecorator = $createTestDecoratorNode().setIsInline(true);
        const secondText = $createTextNode('B');
        const secondParagraph = $createParagraphNode().append(
          secondText,
          secondDecorator,
        );
        $getRoot().clear().append(firstParagraph, secondParagraph);
        const ns = $createNodeSelection();
        ns.add(firstDecorator.getKey());
        ns.add(secondDecorator.getKey());
        $setSelection(ns);
      },
    },
    {
      // Whole-element NodeSelection on a non-inline ElementNode (the
      // paragraph itself). The helper's `n !== targetNode` guard skips
      // the paragraph and walks up; with no other non-inline ancestor
      // below the root, the lookup falls back to root. Without the
      // guard, the paragraph would resolve to itself and the caret
      // would land at the paragraph's leading edge — this case pins
      // down the include-self regression.
      expected: () => ({key: 'root', offset: 0}),
      label: 'whole-element non-inline ElementNode resolves to its parent',
      setup: () => {
        const text = $createTextNode('hello');
        const paragraph = $createParagraphNode().append(text);
        $getRoot().clear().append(paragraph);
        const ns = $createNodeSelection();
        ns.add(paragraph.getKey());
        $setSelection(ns);
      },
    },
  ])('$label', ({setup, expected}) => {
    using editor = buildEditorFromExtensions({
      dependencies: [RichTextExtension],
      name: 'test',
      nodes: [TestDecoratorNode],
    });

    editor.update(setup, {discrete: true});

    dispatchMoveToStart(editor, false);

    editor.read(() => {
      const selection = $getSelection();
      assert($isRangeSelection(selection));
      const {key, offset} = expected();
      expect(selection.isCollapsed()).toBe(true);
      expect(selection.anchor.type).toBe('element');
      expect(selection.anchor.key).toBe(key);
      expect(selection.anchor.offset).toBe(offset);
    });
  });
});
