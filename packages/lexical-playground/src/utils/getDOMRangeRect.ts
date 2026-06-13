/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {getComposedStaticRange} from 'lexical';

export function getDOMRangeRect(
  nativeSelection: Selection,
  rootElement: HTMLElement,
): DOMRect {
  // Resolve through any enclosing DOM shadow roots; getRangeAt(0) and
  // anchorNode are retargeted to the shadow host when the editor is in a
  // shadow tree. Read the composed static range once and derive both the
  // live Range (for getBoundingClientRect) and the anchor node from it,
  // rather than going through getDOMSelectionRange + getDOMSelectionPoints
  // which each call getComposedStaticRange internally.
  const staticRange = getComposedStaticRange(nativeSelection, rootElement);
  let domRange: Range | null;
  let anchorNode: Node | null;

  if (staticRange !== null) {
    const doc = staticRange.startContainer.ownerDocument;
    domRange = null;
    if (doc !== null) {
      const range = doc.createRange();
      try {
        range.setStart(staticRange.startContainer, staticRange.startOffset);
        range.setEnd(staticRange.endContainer, staticRange.endOffset);
        domRange = range;
      } catch (_error) {
        // Fall through to the retargeted range below.
      }
    }
    if (domRange === null) {
      domRange =
        nativeSelection.rangeCount > 0 ? nativeSelection.getRangeAt(0) : null;
    }
    // Selection.direction maps the StaticRange's start/end onto anchor/focus.
    anchorNode =
      nativeSelection.direction === 'backward'
        ? staticRange.endContainer
        : staticRange.startContainer;
  } else {
    domRange =
      nativeSelection.rangeCount > 0 ? nativeSelection.getRangeAt(0) : null;
    anchorNode = nativeSelection.anchorNode;
  }

  let rect;

  if (anchorNode === rootElement || domRange === null) {
    let inner = rootElement;
    while (inner.firstElementChild != null) {
      inner = inner.firstElementChild as HTMLElement;
    }
    rect = inner.getBoundingClientRect();
  } else {
    rect = domRange.getBoundingClientRect();
  }

  return rect;
}
