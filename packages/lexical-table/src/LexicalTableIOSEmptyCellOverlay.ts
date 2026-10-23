/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $getNearestNodeFromDOMNode,
  $getNodeByKey,
  getComposedEventTarget,
  getDOMSelection,
  isHTMLElement,
  type LexicalEditor,
  type NodeKey,
  setDOMUnmanaged,
} from 'lexical';

import {TAP_SLOP} from './constants';
import {
  $isTableCellNode,
  EMPTY_CELL_OVERLAY_ATTRIBUTE,
} from './LexicalTableCellNode';
import {$isCellEmpty} from './LexicalTableUtils';

/**
 * How long a tapped empty cell stays covered. iOS treats a second tap within
 * roughly 350ms as a double tap; the margin covers slower taps.
 */
const DOUBLE_TAP_WINDOW_MS = 500;

/**
 * A touch that stays down longer than this is a long press, not the first tap
 * of a double tap.
 */
const TAP_MAX_MS = 500;

/**
 * On iOS, double tapping an empty table cell makes WebKit select back to the
 * nearest preceding word, which lies outside the table. The selection and its
 * highlight are produced by the OS before the page hears of it, so nothing in
 * the page can cancel or hide them (#9347).
 *
 * After a touch tap lands in an empty cell, that cell is covered for a short
 * window by an unmanaged, non-editable overlay. A second tap in the window
 * lands on the overlay instead of editable text, so iOS does not start a word
 * selection; the overlay places the caret in the cell instead. Outside the
 * window the cell is uncovered, so a long press there still starts the native
 * text selection gesture.
 */
export function registerIOSEmptyCellOverlays(
  editor: LexicalEditor,
): () => void {
  return editor.registerRootListener(rootElement => {
    if (rootElement === null) {
      return;
    }
    const view = rootElement.ownerDocument.defaultView;
    if (view === null) {
      return;
    }
    let current: null | {
      cellDOM: HTMLElement;
      cellKey: NodeKey;
      overlay: HTMLElement;
      // The inline position to restore, or null when it was not changed.
      restorePosition: null | string;
      timer: number;
    } = null;
    let touchStart: null | {x: number; y: number; time: number} = null;
    const clear = () => {
      if (current !== null) {
        view.clearTimeout(current.timer);
        if (current.restorePosition !== null) {
          current.cellDOM.style.position = current.restorePosition;
        }
        current.overlay.remove();
        current = null;
      }
    };

    const isOverlayEvent = (event: Event): boolean =>
      current !== null && getComposedEventTarget(event) === current.overlay;

    const onPointerDown = (event: PointerEvent) => {
      touchStart =
        event.pointerType === 'touch'
          ? {time: Date.now(), x: event.clientX, y: event.clientY}
          : null;
      if (isOverlayEvent(event)) {
        // The overlay is not editable; letting the tap through would blur
        // the editor and drop the keyboard before the caret is placed.
        event.preventDefault();
        return;
      }
      // A tap on the cell that already holds the caret gets no pointerup
      // until iOS knows whether a second tap follows, so cover it now.
      const domSelection = getDOMSelection(view);
      const target = getComposedEventTarget(event);
      const cellDOM = isHTMLElement(target) ? target.closest('td,th') : null;
      if (
        touchStart !== null &&
        cellDOM !== null &&
        domSelection !== null &&
        domSelection.isCollapsed &&
        cellDOM.contains(domSelection.anchorNode)
      ) {
        coverTappedCell(event);
      }
    };

    const coverTappedCell = (event: Event) => {
      if (!editor.isEditable() || isOverlayEvent(event)) {
        return;
      }
      const target = getComposedEventTarget(event);
      const cellDOM = isHTMLElement(target)
        ? target.closest<HTMLElement>('td,th')
        : null;
      if (cellDOM === null || !rootElement.contains(cellDOM)) {
        return;
      }
      const cellKey = editor.read('latest', () => {
        const cell = $getNearestNodeFromDOMNode(cellDOM);
        return $isTableCellNode(cell) && $isCellEmpty(cell)
          ? cell.getKey()
          : null;
      });
      if (cellKey === null) {
        return;
      }
      clear();
      const overlay = rootElement.ownerDocument.createElement('div');
      overlay.setAttribute(EMPTY_CELL_OVERLAY_ATTRIBUTE, 'true');
      overlay.contentEditable = 'false';
      overlay.style.cssText =
        'position:absolute;top:0;right:0;bottom:0;left:0;' +
        '-webkit-user-select:none;user-select:none;' +
        '-webkit-touch-callout:none;touch-action:manipulation';
      setDOMUnmanaged(overlay);
      // The overlay is absolutely positioned to cover the cell; a statically
      // positioned cell would let it cover the nearest positioned ancestor.
      // Undone with the overlay: a cell left positioned keeps a long press
      // drag from moving the caret into the next cell.
      let restorePosition: null | string = null;
      if (view.getComputedStyle(cellDOM).position === 'static') {
        restorePosition = cellDOM.style.position;
        cellDOM.style.position = 'relative';
      }
      cellDOM.append(overlay);
      current = {
        cellDOM,
        cellKey,
        overlay,
        restorePosition,
        timer: view.setTimeout(clear, DOUBLE_TAP_WINDOW_MS),
      };
    };

    // Cover only after a tap. A drag or a long press also ends in pointerup
    // (or in pointercancel when iOS takes the touch over), and covering the
    // cell after one would interfere with the selection it made.
    const onPointerUp = (event: PointerEvent) => {
      const start = touchStart;
      touchStart = null;
      if (
        start !== null &&
        Date.now() - start.time <= TAP_MAX_MS &&
        Math.abs(event.clientX - start.x) <= TAP_SLOP &&
        Math.abs(event.clientY - start.y) <= TAP_SLOP
      ) {
        coverTappedCell(event);
      }
    };

    const onClick = (event: MouseEvent) => {
      if (current === null || !isOverlayEvent(event)) {
        return;
      }
      const {cellKey} = current;
      // Focus inside the tap's click so iOS opens the keyboard.
      rootElement.focus({preventScroll: true});
      editor.update(() => {
        const cell = $getNodeByKey(cellKey);
        if ($isTableCellNode(cell)) {
          cell.selectStart();
        }
      });
    };

    // Capture, so this runs before the table and root handlers.
    rootElement.addEventListener('pointerdown', onPointerDown, true);
    rootElement.addEventListener('pointerup', onPointerUp, true);
    rootElement.addEventListener('click', onClick, true);
    // Typing within the window: the cell is no longer empty, so the overlay
    // must not keep covering its text.
    const removeUpdateListener = editor.registerUpdateListener(
      ({dirtyElements}) => {
        if (current === null || !dirtyElements.has(current.cellKey)) {
          return;
        }
        const {cellKey} = current;
        const isEmpty = editor.read('latest', () => {
          const cell = $getNodeByKey(cellKey);
          return $isTableCellNode(cell) && $isCellEmpty(cell);
        });
        if (!isEmpty) {
          clear();
        }
      },
    );
    return () => {
      clear();
      removeUpdateListener();
      rootElement.removeEventListener('pointerdown', onPointerDown, true);
      rootElement.removeEventListener('pointerup', onPointerUp, true);
      rootElement.removeEventListener('click', onClick, true);
    };
  });
}
