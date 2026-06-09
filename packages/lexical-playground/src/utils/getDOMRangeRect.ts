/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {getComposedSelectionPoints, getDOMSelectionRange} from 'lexical';

export function getDOMRangeRect(
  nativeSelection: Selection,
  rootElement: HTMLElement,
): DOMRect {
  // Resolve through any enclosing DOM shadow roots; getRangeAt(0) and
  // anchorNode are retargeted to the shadow host when the editor is in a
  // shadow tree.
  const domRange = getDOMSelectionRange(nativeSelection, rootElement);
  const {anchorNode} =
    getComposedSelectionPoints(nativeSelection, rootElement) || nativeSelection;

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
