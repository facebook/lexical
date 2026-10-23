/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {buildEditorFromExtensions} from '@lexical/extension';
import {$generateHtmlFromNodes} from '@lexical/html';
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
  defineExtension,
  type ElementNode,
  isDOMUnmanaged,
  type LexicalEditorWithDispose,
} from 'lexical';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

// `vi.mock` is hoisted above all imports, so @lexical/table sees iOS.
vi.mock('lexical/src/environment', async importOriginal => ({
  ...(await importOriginal<typeof import('lexical/src/environment')>()),
  IS_IOS: true,
}));

const OVERLAY = '[data-lexical-table-empty-cell-overlay]';

/**
 * On iOS a double tap in an empty cell makes WebKit select back to the
 * nearest preceding word, outside the table, and paints that selection before
 * the page is notified (#9347). After a touch tap in an empty cell, the cell is
 * briefly covered by an unmanaged, non-editable overlay so the second tap
 * never lands on editable text.
 */
describe('iOS empty table cell overlay', () => {
  let container: HTMLDivElement;
  let editor: LexicalEditorWithDispose;
  let cellKeys: string[];

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement('div');
    container.contentEditable = 'true';
    document.body.appendChild(container);
    editor = buildEditorFromExtensions(
      defineExtension({
        dependencies: [TableExtension],
        name: '@lexical/table/IosEmptyCellOverlayTest',
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
        $getNodeByKey<TableCellNode>(cellKeys[1])!
          .getFirstChildOrThrow<ElementNode>()
          .append($createTextNode('word'));
      },
      {discrete: true},
    );
  });

  afterEach(() => {
    editor.dispose();
    document.body.removeChild(container);
    vi.useRealTimers();
  });

  function cellDOM(index: number): HTMLElement {
    const dom = editor.getElementByKey(cellKeys[index]);
    expect(dom).not.toBe(null);
    return dom!;
  }

  function overlayOf(index: number): HTMLElement | null {
    return cellDOM(index).querySelector(`:scope > ${OVERLAY}`);
  }

  function $cell(index: number): TableCellNode {
    const cell = $getNodeByKey(cellKeys[index]);
    expect($isTableCellNode(cell)).toBe(true);
    return cell as TableCellNode;
  }

  /** jsdom has no PointerEvent constructor, so pointerType is defined here. */
  function pointer(
    target: Element,
    type: string,
    pointerType = 'touch',
    clientX = 0,
  ) {
    const event = new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      clientX,
    });
    Object.defineProperty(event, 'pointerType', {value: pointerType});
    target.dispatchEvent(event);
    return event;
  }

  function tapCell(index: number, pointerType = 'touch'): void {
    const paragraph = cellDOM(index).querySelector('p')!;
    pointer(paragraph, 'pointerdown', pointerType);
    pointer(paragraph, 'pointerup', pointerType);
  }

  test('no cell is covered until it is tapped', () => {
    expect(container.querySelectorAll(OVERLAY)).toHaveLength(0);
  });

  test('a touch tap in an empty cell covers it for the double-tap window', () => {
    tapCell(0);
    const overlay = overlayOf(0);
    expect(overlay).not.toBe(null);
    expect(overlay!.getAttribute('contenteditable')).toBe('false');
    expect(isDOMUnmanaged(overlay!)).toBe(true);
    expect(cellDOM(0).lastElementChild).toBe(overlay);
    vi.advanceTimersByTime(500);
    // Uncovered again, so a later long press reaches editable content.
    expect(overlayOf(0)).toBe(null);
  });

  test('restores the cell position when the overlay goes away', () => {
    const cell = cellDOM(0);
    const before = cell.style.position;
    tapCell(0);
    expect(overlayOf(0)).not.toBe(null);
    expect(cell.style.position).toBe('relative');
    vi.advanceTimersByTime(500);
    expect(overlayOf(0)).toBe(null);
    expect(cell.style.position).toBe(before);
  });

  test('a touch on the cell holding the caret covers it on pointerdown', () => {
    // iOS holds back this tap's pointerup until the next tap has started.
    const paragraph = cellDOM(0).querySelector('p')!;
    document.getSelection()!.collapse(paragraph, 0);
    pointer(paragraph, 'pointerdown');
    expect(overlayOf(0)).not.toBe(null);
  });

  test('a touch elsewhere waits for pointerup before covering', () => {
    const paragraph = cellDOM(0).querySelector('p')!;
    pointer(paragraph, 'pointerdown');
    expect(overlayOf(0)).toBe(null);
  });

  test('a drag that ends in pointerup leaves the start cell uncovered', () => {
    const paragraph = cellDOM(0).querySelector('p')!;
    pointer(paragraph, 'pointerdown', 'touch', 0);
    pointer(paragraph, 'pointerup', 'touch', 80);
    expect(overlayOf(0)).toBe(null);
  });

  test('a long press that ends in pointerup leaves the cell uncovered', () => {
    const paragraph = cellDOM(0).querySelector('p')!;
    pointer(paragraph, 'pointerdown');
    vi.advanceTimersByTime(700);
    pointer(paragraph, 'pointerup');
    expect(overlayOf(0)).toBe(null);
  });

  test('a long press that iOS takes over leaves the cell uncovered', () => {
    const paragraph = cellDOM(0).querySelector('p')!;
    pointer(paragraph, 'pointerdown');
    // iOS cancels the pointer when its own gesture (text selection) starts;
    // only touchend follows.
    pointer(paragraph, 'pointercancel');
    const touchEnd = new Event('touchend', {bubbles: true, cancelable: true});
    // Lexical's own iOS touchend listener reads changedTouches.
    Object.defineProperty(touchEnd, 'changedTouches', {value: []});
    paragraph.dispatchEvent(touchEnd);
    expect(overlayOf(0)).toBe(null);
  });

  test('taps that should not be covered', () => {
    tapCell(1);
    expect(overlayOf(1)).toBe(null);
    tapCell(0, 'mouse');
    expect(overlayOf(0)).toBe(null);
    editor.setEditable(false);
    tapCell(0);
    expect(overlayOf(0)).toBe(null);
  });

  test('only the most recently tapped cell is covered', () => {
    editor.update(
      () => {
        $cell(1).getFirstChildOrThrow<ElementNode>().clear();
      },
      {discrete: true},
    );
    tapCell(0);
    tapCell(1);
    expect(overlayOf(0)).toBe(null);
    expect(overlayOf(1)).not.toBe(null);
  });

  test('a second tap on the overlay places the caret in its cell', () => {
    tapCell(0);
    const overlay = overlayOf(0)!;
    const down = pointer(overlay, 'pointerdown');
    // Not letting the tap blur the editor keeps the iOS keyboard up.
    expect(down.defaultPrevented).toBe(true);
    pointer(overlay, 'pointerup');
    overlay.dispatchEvent(
      new MouseEvent('click', {bubbles: true, cancelable: true, detail: 2}),
    );
    expect(document.activeElement).toBe(container);
    editor.read(() => {
      const selection = $getSelection();
      expect($isRangeSelection(selection)).toBe(true);
      if ($isRangeSelection(selection)) {
        expect(selection.isCollapsed()).toBe(true);
        expect($cell(0).isParentOf(selection.anchor.getNode())).toBe(true);
      }
    });
  });

  test('keeps managed children before the overlay and drops it once the cell has text', () => {
    tapCell(0);
    editor.update(
      () => {
        $cell(0).append($createParagraphNode());
      },
      {discrete: true},
    );
    expect(Array.from(cellDOM(0).children).map(child => child.tagName)).toEqual(
      ['P', 'P', 'DIV'],
    );
    editor.update(
      () => {
        $cell(0)
          .getFirstChildOrThrow<ElementNode>()
          .append($createTextNode('typed'));
      },
      {discrete: true},
    );
    expect(overlayOf(0)).toBe(null);
  });

  test('is left out of exported HTML', () => {
    tapCell(0);
    const html = editor.read(() => $generateHtmlFromNodes(editor));
    expect(html).not.toContain('data-lexical-table-empty-cell-overlay');
    expect(html).toMatch(/<td[^>]*>\s*<p/);
  });
});
