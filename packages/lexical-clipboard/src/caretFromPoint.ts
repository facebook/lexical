/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {getDOMShadowRoots} from 'lexical';

/** @internal */
export function caretFromPoint(
  x: number,
  y: number,
  rootElement: HTMLElement | null = null,
): null | {
  offset: number;
  node: Node;
} {
  // When the editor lives in a DOM shadow tree, a point over shadow content is
  // retargeted to the shadow host by caretRangeFromPoint. Prefer
  // caretPositionFromPoint with the shadowRoots option, which returns the
  // un-retargeted node; browsers without the option ignore it and fall through
  // to the (retargeted) results below.
  const shadowRoots = rootElement ? getDOMShadowRoots(rootElement) : [];
  if (
    shadowRoots.length > 0 &&
    typeof document.caretPositionFromPoint === 'function'
  ) {
    const caretPosition = document.caretPositionFromPoint(x, y, {shadowRoots});
    if (caretPosition !== null) {
      return {node: caretPosition.offsetNode, offset: caretPosition.offset};
    }
  }
  if (typeof document.caretRangeFromPoint === 'function') {
    const range = document.caretRangeFromPoint(x, y);
    return range === null
      ? null
      : {node: range.startContainer, offset: range.startOffset};
  } else if (typeof document.caretPositionFromPoint === 'function') {
    const caretPosition = document.caretPositionFromPoint(x, y);
    return caretPosition === null
      ? null
      : {node: caretPosition.offsetNode, offset: caretPosition.offset};
  }
  // Gracefully handle IE
  return null;
}
