/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {vi} from 'vitest';

vi.mock('shared/invariant');
vi.mock('shared/devInvariant');
vi.mock('shared/warnOnlyOnce');

// jsdom workarounds for the unit-test environment. Real browsers (and the
// playwright e2e suite) do not need any of these patches, so we gate on the
// jsdom-specific user-agent string and only patch when running there.
//
// 1. jsdom >= 24.1.1 collapses an existing text-node DOM selection to the
//    start of the focused element when HTMLElement.focus() is called on a
//    contenteditable ancestor. Real browsers (and happy-dom) preserve the
//    selection. Restore the pre-focus selection when this happens.
// 2. jsdom does not implement Range.prototype.getBoundingClientRect, so
//    Lexical's scroll-into-view path throws when reading it. Stub it.
const isJsdom =
  typeof navigator !== 'undefined' && /\bjsdom\//.test(navigator.userAgent);
if (isJsdom) {
  const originalFocus = HTMLElement.prototype.focus;
  function focusPreservingSelection(
    this: HTMLElement,
    options?: FocusOptions,
  ): void {
    const sel = document.getSelection();
    const snapshot =
      sel && sel.rangeCount > 0
        ? {
            anchorNode: sel.anchorNode,
            anchorOffset: sel.anchorOffset,
            focusNode: sel.focusNode,
            focusOffset: sel.focusOffset,
          }
        : null;
    originalFocus.call(this, options);
    if (
      snapshot !== null &&
      snapshot.anchorNode !== null &&
      snapshot.focusNode !== null &&
      this.contains(snapshot.anchorNode) &&
      this.contains(snapshot.focusNode) &&
      sel !== null &&
      (sel.anchorNode !== snapshot.anchorNode ||
        sel.anchorOffset !== snapshot.anchorOffset ||
        sel.focusNode !== snapshot.focusNode ||
        sel.focusOffset !== snapshot.focusOffset)
    ) {
      try {
        sel.setBaseAndExtent(
          snapshot.anchorNode,
          snapshot.anchorOffset,
          snapshot.focusNode,
          snapshot.focusOffset,
        );
      } catch {
        // Ignore restoration failures; tests that depend on selection will
        // surface them downstream.
      }
    }
  }
  HTMLElement.prototype.focus = focusPreservingSelection;

  if (typeof Range.prototype.getBoundingClientRect !== 'function') {
    // jsdom does not implement layout, so a zero-rect stub is sufficient
    // for code paths that only need a DOMRect-shaped value (like
    // Lexical's scroll-into-view computation).
    Range.prototype.getBoundingClientRect = function (): DOMRect {
      return {
        bottom: 0,
        height: 0,
        left: 0,
        right: 0,
        toJSON() {
          return this;
        },
        top: 0,
        width: 0,
        x: 0,
        y: 0,
      } as DOMRect;
    };
  }
}
