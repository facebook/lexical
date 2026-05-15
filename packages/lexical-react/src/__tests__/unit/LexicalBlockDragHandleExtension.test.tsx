/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {
  $createHorizontalRuleNode,
  buildEditorFromExtensions,
  HorizontalRuleExtension,
} from '@lexical/extension';
import {
  BLOCK_DRAG_HANDLE_ATTR,
  BLOCK_DRAG_INNER_ATTR,
  BLOCK_DRAG_WRAPPER_ATTR,
  BlockDragHandleExtension,
} from '@lexical/react/LexicalBlockDragHandleExtension';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createTableNodeWithDimensions,
  $isTableNode,
  TableExtension,
} from '@lexical/table';
import {
  $createLineBreakNode,
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  defineExtension,
} from 'lexical';
import {describe, expect, test} from 'vitest';

describe('BlockDragHandleExtension', () => {
  test('wraps top-level block ElementNode DOM with a sibling drag handle', () => {
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
      // Handle and inner are siblings inside the wrapper.
      expect(handle?.parentElement).toBe(wrapper);
      expect(inner?.parentElement).toBe(wrapper);
      // Lexical children mount inside the inner element (via the slot).
      expect(
        inner?.querySelector('[data-lexical-text="true"]')?.textContent,
      ).toBe('hello');
    });
  });

  test('does not wrap inline children (line breaks stay untouched)', () => {
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
      // Only one wrapper around the paragraph; the line break inside the
      // paragraph is untouched.
      expect(wrappers).toHaveLength(1);
      const inner = wrappers[0].querySelector(`[${BLOCK_DRAG_INNER_ATTR}]`);
      const br = inner?.querySelector('br');
      expect(br).not.toBeNull();
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

  test('drag handle is contenteditable=false and draggable', () => {
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

  test('wraps a top-level DecoratorNode (HR) with handle + inner', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        $initialEditorState: () => {
          $getRoot().append($createHorizontalRuleNode());
        },
        dependencies: [
          RichTextExtension,
          HorizontalRuleExtension,
          BlockDragHandleExtension,
        ],
        name: 'test-decorator-wrap',
      }),
    );
    const root = document.createElement('div');
    editor.setRootElement(root);
    editor.read(() => {
      const wrappers = root.querySelectorAll(`[${BLOCK_DRAG_WRAPPER_ATTR}]`);
      expect(wrappers).toHaveLength(1);
      const wrapper = wrappers[0];
      const handle = wrapper.querySelector(`[${BLOCK_DRAG_HANDLE_ATTR}]`);
      const inner = wrapper.querySelector(`[${BLOCK_DRAG_INNER_ATTR}]`);
      expect(handle?.tagName).toBe('BUTTON');
      expect(inner?.tagName).toBe('HR');
      expect(handle?.parentElement).toBe(wrapper);
      expect(inner?.parentElement).toBe(wrapper);
    });
  });

  test('wrap preserves TableNode getDOMSlot (rows go inside <table>, not the scrollable wrapper)', () => {
    using editor = buildEditorFromExtensions(
      defineExtension({
        $initialEditorState: () => {
          // 2 rows × 2 cols, with `hasHorizontalScroll: true` (TableExtension
          // default) — TableNode.createDOM returns `<div><table>…</table></div>`.
          // Without the `node.getDOMSlot(inner)` routing in
          // `BlockDragHandleExtension`, rows would be inserted into the outer
          // `<div>` instead of the `<table>`, orphaning every row.
          const table = $createTableNodeWithDimensions(2, 2, true);
          $getRoot().append(table);
        },
        dependencies: [
          RichTextExtension,
          TableExtension,
          BlockDragHandleExtension,
        ],
        name: 'test-table-wrap',
        theme: {tableScrollableWrapper: 'scroll-wrapper'},
      }),
    );
    const root = document.createElement('div');
    editor.setRootElement(root);
    editor.read(() => {
      const tableNode = $getRoot()
        .getChildren()
        .find(child => $isTableNode(child));
      expect(tableNode).toBeDefined();
      const wrapper = root.querySelector(`[${BLOCK_DRAG_WRAPPER_ATTR}]`);
      expect(wrapper).not.toBeNull();
      // Inner is the scrollable `<div>`; the `<table>` lives inside it.
      const inner = wrapper!.querySelector(`[${BLOCK_DRAG_INNER_ATTR}]`);
      expect(inner?.tagName).toBe('DIV');
      const table = inner!.querySelector(':scope > table');
      expect(table).not.toBeNull();
      // Rows must be inside the `<table>`, not loose in the scrollable div.
      const rows = table!.querySelectorAll('tr');
      expect(rows.length).toBe(2);
      rows.forEach(row => {
        expect(row.closest('table')).toBe(table);
      });
    });
  });
});
