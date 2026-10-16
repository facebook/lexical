/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import {$generateHtmlFromNodes} from '@lexical/html';
import {RichTextExtension} from '@lexical/rich-text';
import {
  $createTableNodeWithDimensions,
  $isTableCellNode,
  $isTableRowNode,
  type TableCellNode,
  TableExtension,
} from '@lexical/table';
import {
  $createParagraphNode,
  $createTextNode,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_CRITICAL,
  defineExtension,
  DELETE_CHARACTER_COMMAND,
  type ElementNode,
  type LexicalEditorWithDispose,
} from 'lexical';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

// `vi.mock` is hoisted above all imports, so @lexical/table sees iOS. jsdom
// has no beforeinput support, so it is enabled for the Backspace tests.
vi.mock('lexical/src/environment', async importOriginal => ({
  ...(await importOriginal<typeof import('lexical/src/environment')>()),
  CAN_USE_BEFORE_INPUT: true,
  IS_IOS: true,
}));

const CONTENT_ATTRIBUTE = 'data-lexical-table-cell-content';

/**
 * On iOS a double tap in an empty cell makes WebKit select back to the
 * nearest preceding word, which lies outside the table. The cell content is
 * therefore rendered inside its own editing host so that search cannot leave
 * the cell (#9347). These tests pin the DOM shape and the two side effects
 * that structure needs handled.
 */
describe('iOS table cell editing host', () => {
  let container: HTMLDivElement;
  let editor: LexicalEditorWithDispose;
  let cellKeys: string[];

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [RichTextExtension, TableExtension],
        name: '@lexical/table/IosCellEditingHostTest',
        theme: {tableScrollableWrapper: ''},
      }),
    );
    editor.setRootElement(container);
    cellKeys = [];
    editor.update(
      () => {
        const before = $createParagraphNode().append($createTextNode('before'));
        const table = $createTableNodeWithDimensions(1, 2, false);
        $getRoot().clear().append(before, table);
        for (const row of table.getChildren()) {
          if ($isTableRowNode(row)) {
            for (const cell of row.getChildren()) {
              cellKeys.push(cell.getKey());
            }
          }
        }
      },
      {discrete: true},
    );
  });

  afterEach(() => {
    editor.dispose();
    document.body.removeChild(container);
  });

  function cellDOM(index: number): HTMLTableCellElement {
    const dom = editor.getElementByKey(cellKeys[index]);
    expect(dom).not.toBe(null);
    return dom as HTMLTableCellElement;
  }

  function wrapperOf(cell: HTMLTableCellElement): HTMLElement {
    const wrapper = cell.querySelector(`:scope > [${CONTENT_ATTRIBUTE}]`);
    expect(wrapper).not.toBe(null);
    return wrapper as HTMLElement;
  }

  function $cell(index: number): TableCellNode {
    const cell = $getNodeByKey(cellKeys[index]);
    expect($isTableCellNode(cell)).toBe(true);
    return cell as TableCellNode;
  }

  /** Puts a caret at the start of a cell and focuses its editing host. */
  function placeCaretInCell(index: number): HTMLElement {
    editor.update(() => $cell(index).selectStart(), {discrete: true});
    const wrapper = wrapperOf(cellDOM(index));
    wrapper.focus();
    expect(document.activeElement).toBe(wrapper);
    return wrapper;
  }

  function dispatchBackspaceBeforeInput(target: Element): boolean {
    const event = new InputEvent('beforeinput', {
      bubbles: true,
      cancelable: true,
      inputType: 'deleteContentBackward',
    });
    target.dispatchEvent(event);
    return event.defaultPrevented;
  }

  test('renders the cell content inside a nested editing host', () => {
    const cell = cellDOM(0);
    expect(cell.getAttribute('contenteditable')).toBe('false');
    const wrapper = wrapperOf(cell);
    expect(wrapper.getAttribute('contenteditable')).toBe('true');
    // The paragraph is reconciled into the wrapper, not the cell.
    expect(cell.children).toHaveLength(1);
    expect(wrapper.querySelector('p')).not.toBe(null);
  });

  test('keeps the same editing host as paragraphs are added', () => {
    const cell = cellDOM(0);
    const wrapper = wrapperOf(cell);
    editor.update(
      () => {
        $cell(0).append(
          $createParagraphNode().append($createTextNode('second')),
        );
      },
      {discrete: true},
    );
    // A new host would drop focus on iOS; the wrapper identity must hold.
    expect(wrapperOf(cellDOM(0))).toBe(wrapper);
    expect(wrapper.querySelectorAll(':scope > p')).toHaveLength(2);
    expect(cell.children).toHaveLength(1);
  });

  test('follows the editable state of the editor', () => {
    const wrapper = wrapperOf(cellDOM(0));
    editor.setEditable(false);
    expect(wrapper.getAttribute('contenteditable')).toBe('false');
    editor.setEditable(true);
    expect(wrapper.getAttribute('contenteditable')).toBe('true');
  });

  test('exports HTML without the wrapper or contenteditable', () => {
    const html = editor.read(() => $generateHtmlFromNodes(editor));
    expect(html).not.toContain(CONTENT_ATTRIBUTE);
    expect(html).not.toContain('contenteditable');
    expect(html).toMatch(/<td[^>]*>\s*<p/);
  });

  /**
   * Whether the guard consumed the Backspace is visible in what Lexical does
   * next: an unconsumed `beforeinput` goes on to dispatch
   * DELETE_CHARACTER_COMMAND, a consumed one does not.
   */
  function spyOnDeleteCharacter(): {calls: number} {
    const spy = {calls: 0};
    editor.registerCommand(
      DELETE_CHARACTER_COMMAND,
      () => {
        spy.calls += 1;
        return false;
      },
      COMMAND_PRIORITY_CRITICAL,
    );
    return spy;
  }

  test('consumes Backspace at the start of an empty cell', () => {
    const wrapper = placeCaretInCell(1);
    const spy = spyOnDeleteCharacter();
    // WebKit's default would move the caret into the previous editing host,
    // the cell to the left.
    expect(dispatchBackspaceBeforeInput(wrapper)).toBe(true);
    expect(spy.calls).toBe(0);
    editor.read(() => {
      const selection = $getSelection();
      expect($isRangeSelection(selection)).toBe(true);
      if ($isRangeSelection(selection)) {
        expect(selection.isCollapsed()).toBe(true);
        expect($cell(1).isParentOf(selection.anchor.getNode())).toBe(true);
      }
      // Nothing outside the cell was touched.
      expect($getRoot().getFirstChildOrThrow().getTextContent()).toBe('before');
      expect(cellKeys.map(key => $getNodeByKey(key)).every(Boolean)).toBe(true);
    });
  });

  test('leaves Backspace alone in a cell with text', () => {
    editor.update(
      () => {
        $cell(1)
          .getFirstChildOrThrow<ElementNode>()
          .append($createTextNode('word'));
      },
      {discrete: true},
    );
    editor.update(
      () => $cell(1).getFirstChildOrThrow<ElementNode>().selectEnd(),
      {discrete: true},
    );
    const wrapper = wrapperOf(cellDOM(1));
    wrapper.focus();
    const spy = spyOnDeleteCharacter();
    dispatchBackspaceBeforeInput(wrapper);
    // Lexical's own delete path ran.
    expect(spy.calls).toBe(1);
  });
});
