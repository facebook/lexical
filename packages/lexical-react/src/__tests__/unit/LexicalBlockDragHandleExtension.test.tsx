/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {buildEditorFromExtensions} from '@lexical/extension';
import {
  BLOCK_DRAG_HANDLE_ATTR,
  BLOCK_DRAG_INNER_ATTR,
  BLOCK_DRAG_WRAPPER_ATTR,
  BlockDragHandleExtension,
} from '@lexical/react/LexicalBlockDragHandleExtension';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  defineExtension,
} from 'lexical';
import {describe, expect, test} from 'vitest';

describe('BlockDragHandleExtension', () => {
  test('wraps top-level block ElementNode DOM with drag handle', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        $initialEditorState: () => {
          $getRoot().append(
            $createParagraphNode().append($createTextNode('hello')),
          );
        },
        dependencies: [RichTextExtension, BlockDragHandleExtension],
        name: 'test',
      }),
    );
    const root = document.createElement('div');
    editor.setRootElement(root);
    editor.read(() => {
      const wrappers = root.querySelectorAll(`[${BLOCK_DRAG_WRAPPER_ATTR}]`);
      expect(wrappers).toHaveLength(1);
      const wrapper = wrappers[0];
      const handle = wrapper.querySelector(`[${BLOCK_DRAG_HANDLE_ATTR}]`);
      expect(handle).not.toBeNull();
      expect(handle?.tagName).toBe('BUTTON');
      const inner = wrapper.querySelector(`[${BLOCK_DRAG_INNER_ATTR}]`);
      expect(inner).not.toBeNull();
      expect(inner?.tagName).toBe('P');
      // Handle is sibling of inner inside wrapper, not inside it
      expect(handle?.parentElement).toBe(wrapper);
      expect(inner?.parentElement).toBe(wrapper);
      // Children mount inside inner (via getDOMSlot pointing at inner)
      expect(
        inner?.querySelector('[data-lexical-text="true"]')?.textContent,
      ).toBe('hello');
    });
  });

  test('does not wrap inline ElementNode (e.g. LinkNode-like inline)', () => {
    // LineBreakNode is a leaf, not ElementNode — verify the wrap only targets
    // ElementNode (not other categories).
    using editor = buildEditorFromExtensions(
      defineExtension({
        $initialEditorState: () => {
          $getRoot().append(
            $createParagraphNode().append(
              $createTextNode('before'),
              $createLineBreakNode(),
              $createTextNode('after'),
            ),
          );
        },
        dependencies: [RichTextExtension, BlockDragHandleExtension],
        name: 'test-leaf-untouched',
      }),
    );
    const root = document.createElement('div');
    editor.setRootElement(root);
    editor.read(() => {
      const wrappers = root.querySelectorAll(`[${BLOCK_DRAG_WRAPPER_ATTR}]`);
      // Only one wrapper around the paragraph; the line break inside is untouched
      expect(wrappers).toHaveLength(1);
      const inner = wrappers[0].querySelector(`[${BLOCK_DRAG_INNER_ATTR}]`);
      // Inner contains the linebreak directly (no wrapper around <br>)
      expect(inner?.querySelector('br')).not.toBeNull();
      // <br> is a direct child of the inner paragraph, not wrapped
      const br = inner?.querySelector('br');
      expect(br?.parentElement).toBe(inner);
    });
  });

  test('wraps multiple top-level blocks independently', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        $initialEditorState: () => {
          $getRoot().append(
            $createParagraphNode().append($createTextNode('first')),
            $createParagraphNode().append($createTextNode('second')),
            $createParagraphNode().append($createTextNode('third')),
          );
        },
        dependencies: [RichTextExtension, BlockDragHandleExtension],
        name: 'test-multi',
      }),
    );
    const root = document.createElement('div');
    editor.setRootElement(root);
    editor.read(() => {
      const wrappers = root.querySelectorAll(`[${BLOCK_DRAG_WRAPPER_ATTR}]`);
      expect(wrappers).toHaveLength(3);
      const texts = Array.from(wrappers).map(
        w => w.querySelector('[data-lexical-text="true"]')?.textContent ?? null,
      );
      expect(texts).toEqual(['first', 'second', 'third']);
    });
  });

  test('drag handle is contenteditable=false', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        $initialEditorState: () => {
          $getRoot().append(
            $createParagraphNode().append($createTextNode('hello')),
          );
        },
        dependencies: [RichTextExtension, BlockDragHandleExtension],
        name: 'test-handle-noneditable',
      }),
    );
    const root = document.createElement('div');
    editor.setRootElement(root);
    editor.read(() => {
      const handle = root.querySelector<HTMLButtonElement>(
        `[${BLOCK_DRAG_HANDLE_ATTR}]`,
      );
      expect(handle).not.toBeNull();
      expect(handle?.contentEditable).toBe('false');
      expect(handle?.draggable).toBe(true);
    });
  });
});
