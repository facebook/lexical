/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  getComposedEventTarget,
  isHTMLElement,
  type LexicalEditor,
} from 'lexical';

/**
 * On iOS, a long press drag across table cells keeps moving the native caret
 * while the table selection keeps clearing it, so the caret flickers for the
 * whole gesture. The caret is hidden while a finger is down on a table cell
 * and restored when the touch ends.
 *
 * This reduces the flicker rather than removing it: the caret iOS draws
 * around its magnifier during the gesture is not affected by `caret-color`.
 */
export function registerIOSTableDragCaretHiding(
  editor: LexicalEditor,
): () => void {
  return editor.registerRootListener(rootElement => {
    const view =
      rootElement === null ? null : rootElement.ownerDocument.defaultView;
    if (rootElement === null || view === null) {
      return;
    }
    // The inline caret-color to restore, or null when not hiding. Other code
    // (the block cursor) also sets it, so the previous value is kept.
    let restoreCaretColor: null | string = null;

    const onTouchStart = (event: TouchEvent) => {
      const target = getComposedEventTarget(event);
      if (
        restoreCaretColor !== null ||
        !editor.isEditable() ||
        !isHTMLElement(target) ||
        target.closest('td,th') === null
      ) {
        return;
      }
      restoreCaretColor = rootElement.style.caretColor;
      rootElement.style.caretColor = 'transparent';
    };

    const onTouchEnd = (event: TouchEvent) => {
      // A second finger lifting is not the end of the gesture.
      if (restoreCaretColor === null || event.touches.length > 0) {
        return;
      }
      rootElement.style.caretColor = restoreCaretColor;
      restoreCaretColor = null;
    };

    rootElement.addEventListener('touchstart', onTouchStart, true);
    // On the window, since the finger can be lifted outside the editor.
    view.addEventListener('touchend', onTouchEnd, true);
    view.addEventListener('touchcancel', onTouchEnd, true);
    return () => {
      rootElement.removeEventListener('touchstart', onTouchStart, true);
      view.removeEventListener('touchend', onTouchEnd, true);
      view.removeEventListener('touchcancel', onTouchEnd, true);
      if (restoreCaretColor !== null) {
        rootElement.style.caretColor = restoreCaretColor;
      }
    };
  });
}
