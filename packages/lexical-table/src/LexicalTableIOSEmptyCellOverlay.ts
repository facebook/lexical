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
  $isElementNode,
  getComposedEventTarget,
  isHTMLElement,
  type LexicalEditor,
  mergeRegister,
  setDOMUnmanaged,
} from 'lexical';

import {
  $isTableCellNode,
  createEmptyCellOverlay,
  getEmptyCellOverlay,
  type TableCellNode,
} from './LexicalTableCellNode';

/**
 * How long a tapped empty cell stays covered. iOS treats a second tap within
 * roughly 350ms as a double tap; the margin covers slower taps.
 */
const DOUBLE_TAP_WINDOW_MS = 500;

/**
 * A touch that moves farther or stays down longer than this is a drag or a
 * long press, not the first tap of a double tap.
 */
const TAP_SLOP_PX = 10;
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
  return mergeRegister(
    // Typing within the window: the cell is no longer empty, so the overlay
    // must not keep covering its text.
    editor.registerUpdateListener(({dirtyElements}) => {
      editor.read('latest', () => {
        for (const key of dirtyElements.keys()) {
          const node = $getNodeByKey(key);
          if ($isTableCellNode(node) && !$isCellEmpty(node)) {
            const dom = editor.getElementByKey(key);
            const overlay = isHTMLElement(dom)
              ? getEmptyCellOverlay(dom)
              : null;
            if (overlay !== null) {
              removeOverlay(overlay);
            }
          }
        }
      });
    }),
    editor.registerRootListener(rootElement => {
      const view =
        rootElement === null ? null : rootElement.ownerDocument.defaultView;
      if (rootElement === null || view === null) {
        return;
      }
      let current: null | {overlay: HTMLElement; timer: number} = null;
      let touchStart: null | {x: number; y: number; time: number} = null;
      const clear = () => {
        if (current !== null) {
          view.clearTimeout(current.timer);
          removeOverlay(current.overlay);
          current = null;
        }
      };

      const findOverlay = (event: Event): HTMLElement | null => {
        const target = getComposedEventTarget(event);
        return isHTMLElement(target) &&
          isHTMLElement(target.parentElement) &&
          getEmptyCellOverlay(target.parentElement) === target
          ? target
          : null;
      };

      const onPointerDown = (event: PointerEvent) => {
        touchStart =
          event.pointerType === 'touch'
            ? {time: Date.now(), x: event.clientX, y: event.clientY}
            : null;
        if (findOverlay(event) !== null) {
          // The overlay is not editable; letting the tap through would blur
          // the editor and drop the keyboard before the caret is placed.
          event.preventDefault();
        }
      };

      const coverTappedCell = (event: Event) => {
        if (!editor.isEditable() || findOverlay(event) !== null) {
          return;
        }
        const target = getComposedEventTarget(event);
        const cellDOM = isHTMLElement(target)
          ? target.closest<HTMLElement>('td,th')
          : null;
        if (cellDOM === null || !rootElement.contains(cellDOM)) {
          return;
        }
        const isEmptyCell = editor.read('latest', () => {
          const cell = $getNearestNodeFromDOMNode(cellDOM);
          return $isTableCellNode(cell) && $isCellEmpty(cell);
        });
        if (!isEmptyCell) {
          return;
        }
        clear();
        const overlay = createEmptyCellOverlay(rootElement.ownerDocument);
        setDOMUnmanaged(overlay);
        // The overlay is absolutely positioned to cover the cell; a statically
        // positioned cell would let it cover the nearest positioned ancestor.
        // Undone with the overlay: a cell left positioned keeps a long press
        // drag from moving the caret into the next cell.
        if (view.getComputedStyle(cellDOM).position === 'static') {
          overlay.dataset.restorePosition = cellDOM.style.position;
          cellDOM.style.position = 'relative';
        }
        cellDOM.append(overlay);
        current = {
          overlay,
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
          event.pointerType === 'touch' &&
          start !== null &&
          Date.now() - start.time <= TAP_MAX_MS &&
          Math.abs(event.clientX - start.x) <= TAP_SLOP_PX &&
          Math.abs(event.clientY - start.y) <= TAP_SLOP_PX
        ) {
          coverTappedCell(event);
        }
      };

      const onClick = (event: MouseEvent) => {
        const overlay = findOverlay(event);
        if (overlay === null) {
          return;
        }
        // Focus inside the tap's click so iOS opens the keyboard.
        rootElement.focus({preventScroll: true});
        editor.update(() => {
          const cell = $getNearestNodeFromDOMNode(overlay);
          if ($isTableCellNode(cell)) {
            cell.selectStart();
          }
        });
      };

      // Capture, so this runs before the table and root handlers.
      rootElement.addEventListener('pointerdown', onPointerDown, true);
      rootElement.addEventListener('pointerup', onPointerUp, true);
      rootElement.addEventListener('click', onClick, true);
      return () => {
        clear();
        rootElement.removeEventListener('pointerdown', onPointerDown, true);
        rootElement.removeEventListener('pointerup', onPointerUp, true);
        rootElement.removeEventListener('click', onClick, true);
      };
    }),
  );
}

function $isCellEmpty(cell: TableCellNode): boolean {
  const children = cell.getChildren();
  return (
    children.length > 0 &&
    children.every(child => $isElementNode(child) && child.isEmpty())
  );
}

function removeOverlay(overlay: HTMLElement): void {
  const cellDOM = overlay.parentElement;
  const restorePosition = overlay.dataset.restorePosition;
  if (cellDOM !== null && restorePosition !== undefined) {
    cellDOM.style.position = restorePosition;
  }
  overlay.remove();
}
