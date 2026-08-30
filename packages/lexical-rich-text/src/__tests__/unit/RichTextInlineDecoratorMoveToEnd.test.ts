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

describe('MOVE_TO_END with no trailing text (Issue #8601)', () => {
  test('Cmd+ArrowRight on decorator-only element moves caret past the last child', () => {
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

    dispatchMoveToEnd(editor, false);

    editor.read(() => {
      const selection = $getSelection();
      assert($isRangeSelection(selection));
      const paragraph = $getRoot().getFirstChildOrThrow();
      expect(selection.isCollapsed()).toBe(true);
      expect(selection.focus.type).toBe('element');
      expect(selection.focus.key).toBe(paragraph.getKey());
      expect(selection.focus.offset).toBe(1);
    });
  });

  test('Shift+Cmd+ArrowRight on decorator-only element selects past the last child', () => {
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

    dispatchMoveToEnd(editor, true);

    editor.read(() => {
      const selection = $getSelection();
      assert($isRangeSelection(selection));
      const paragraph = $getRoot().getFirstChildOrThrow();
      expect(selection.isCollapsed()).toBe(false);
      expect(selection.anchor.type).toBe('element');
      expect(selection.anchor.key).toBe(paragraph.getKey());
      expect(selection.anchor.offset).toBe(0);
      expect(selection.focus.type).toBe('element');
      expect(selection.focus.key).toBe(paragraph.getKey());
      expect(selection.focus.offset).toBe(1);
    });
  });

  test('Cmd+ArrowRight on [decorator][text][decorator] sandwich moves caret past the trailing decorator', () => {
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
      const paragraph = $getRoot().getFirstChildOrThrow();
      expect(selection.isCollapsed()).toBe(true);
      expect(selection.focus.type).toBe('element');
      expect(selection.focus.key).toBe(paragraph.getKey());
      expect(selection.focus.offset).toBe(3);
    });
  });
});

describe('MOVE_TO_END on a NodeSelection (Issue #8604)', () => {
  test.for([
    {
      expected: () => {
        const paragraph = $getRoot().getFirstChildOrThrow();
        return {key: paragraph.getKey(), offset: 2};
      },
      label: 'single inline decorator collapses to the block end',
      setup: () => {
        const decorator = $createTestDecoratorNode().setIsInline(true);
        const text = $createTextNode('hello');
        const paragraph = $createParagraphNode().append(decorator, text);
        $getRoot().clear().append(paragraph);
        const ns = $createNodeSelection();
        ns.add(decorator.getKey());
        $setSelection(ns);
      },
    },
    {
      expected: () => {
        const secondParagraph = $getRoot().getChildAtIndex(1);
        assert(secondParagraph !== null);
        return {key: secondParagraph.getKey(), offset: 2};
      },
      label: 'multi-node selection picks the iteration-order last node',
      setup: () => {
        const firstDecorator = $createTestDecoratorNode().setIsInline(true);
        const firstText = $createTextNode('A');
        const firstParagraph = $createParagraphNode().append(
          firstDecorator,
          firstText,
        );
        const secondDecorator = $createTestDecoratorNode().setIsInline(true);
        const secondText = $createTextNode('B');
        const secondParagraph = $createParagraphNode().append(
          secondDecorator,
          secondText,
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
      // would land at the paragraph's trailing edge — this case pins
      // down the include-self regression.
      expected: () => ({
        key: 'root',
        offset: $getRoot().getChildrenSize(),
      }),
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

    dispatchMoveToEnd(editor, false);

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
