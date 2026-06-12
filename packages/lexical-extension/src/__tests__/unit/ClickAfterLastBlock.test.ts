/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  buildEditorFromExtensions,
  ClickAfterLastBlockExtension,
} from '@lexical/extension';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  $isParagraphNode,
  configExtension,
  defineExtension,
  type LexicalNode,
} from 'lexical';
import {
  $createTestDecoratorNode,
  TestDecoratorNode,
} from 'lexical/src/__tests__/utils';
import {assert, describe, expect, test} from 'vitest';

function setUpEditor(
  options: {
    disabled?: boolean;
    $shouldInsertAfter?: (node: LexicalNode) => boolean;
    withInitialChildren?: boolean;
  } = {},
) {
  const {
    disabled = false,
    $shouldInsertAfter,
    withInitialChildren = true,
  } = options;
  return buildEditorFromExtensions(
    defineExtension({
      $initialEditorState: withInitialChildren
        ? () => {
            const root = $getRoot();
            // Block-level TestDecoratorNode at the end of the document,
            // to exercise the same path Equation / PageBreak hit in the
            // playground.
            const decorator = $createTestDecoratorNode().setIsInline(false);
            root.append(
              $createParagraphNode().append($createTextNode('hello')),
              decorator,
            );
          }
        : () => {},
      dependencies: [
        RichTextExtension,
        configExtension(ClickAfterLastBlockExtension, {
          disabled,
          ...($shouldInsertAfter ? {$shouldInsertAfter} : {}),
        }),
      ],
      name: 'click-after-last-block-test',
      nodes: [TestDecoratorNode],
      register: editor => {
        const rootElement = document.createElement('div');
        document.body.appendChild(rootElement);
        editor.setRootElement(rootElement);
        return () => rootElement.remove();
      },
    }),
  );
}

function dispatchMouseEvent(
  type: 'mousedown' | 'click',
  rootElement: HTMLElement,
  clientY: number,
): MouseEvent {
  // jsdom's getBoundingClientRect returns all-zero, so any positive
  // clientY satisfies the "below the last block" check.
  // dispatchEvent already sets event.target = rootElement.
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientY,
  });
  rootElement.dispatchEvent(event);
  return event;
}

describe('ClickAfterLastBlockExtension', () => {
  test('inserts a paragraph after the last block when the last child is a block decorator', () => {
    using editor = setUpEditor();
    const root = editor.getRootElement()!;
    const initialChildren = editor.read(() => $getRoot().getChildrenSize());
    expect(initialChildren).toBe(2);

    dispatchMouseEvent('mousedown', root, 100);
    dispatchMouseEvent('click', root, 100);

    editor.read(() => {
      const rootNode = $getRoot();
      expect(rootNode.getChildrenSize()).toBe(3);
      const lastChild = rootNode.getLastChild();
      assert(
        lastChild !== null && $isParagraphNode(lastChild),
        'last child after click should be an empty paragraph',
      );
      expect(lastChild.isEmpty()).toBe(true);
    });
  });

  test('does nothing when the predicate rejects the last child', () => {
    using editor = setUpEditor({$shouldInsertAfter: () => false});
    const root = editor.getRootElement()!;

    dispatchMouseEvent('mousedown', root, 100);
    dispatchMouseEvent('click', root, 100);

    editor.read(() => {
      // Predicate refused → original 2 children stay.
      expect($getRoot().getChildrenSize()).toBe(2);
    });
  });

  test('respects disabled config', () => {
    using editor = setUpEditor({disabled: true});
    const root = editor.getRootElement()!;

    dispatchMouseEvent('mousedown', root, 100);
    dispatchMouseEvent('click', root, 100);

    editor.read(() => {
      // Disabled → original 2 children stay.
      expect($getRoot().getChildrenSize()).toBe(2);
    });
  });

  test('does nothing in read-only mode', () => {
    using editor = setUpEditor();
    const root = editor.getRootElement()!;
    editor.setEditable(false);

    dispatchMouseEvent('mousedown', root, 100);
    dispatchMouseEvent('click', root, 100);

    editor.read(() => {
      expect($getRoot().getChildrenSize()).toBe(2);
    });
  });

  test('does nothing on an empty root with no last child', () => {
    using editor = setUpEditor({withInitialChildren: false});
    const root = editor.getRootElement()!;

    dispatchMouseEvent('mousedown', root, 100);
    dispatchMouseEvent('click', root, 100);

    editor.read(() => {
      // No crash, no insertion.
      expect($getRoot().getChildrenSize()).toBe(0);
    });
  });
});
