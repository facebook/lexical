/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {getDOMShadowRoots, getRootOwnerDocument} from 'lexical';

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
  // un-retargeted node. Browsers that don't implement the option silently
  // ignore it and return a retargeted result, so verify the offset node
  // actually landed inside one of the requested shadow roots before trusting
  // it; otherwise fall through to the legacy paths below.
  const doc = getRootOwnerDocument(rootElement);
  const shadowRoots = rootElement ? getDOMShadowRoots(rootElement) : [];
  if (
    shadowRoots.length > 0 &&
    typeof doc.caretPositionFromPoint === 'function'
  ) {
    const caretPosition = doc.caretPositionFromPoint(x, y, {shadowRoots});
    if (
      caretPosition !== null &&
      shadowRoots.some(root => root.contains(caretPosition.offsetNode))
    ) {
      return {node: caretPosition.offsetNode, offset: caretPosition.offset};
    }
  }
  if (typeof doc.caretRangeFromPoint === 'function') {
    const range = doc.caretRangeFromPoint(x, y);
    return range === null
      ? null
      : {node: range.startContainer, offset: range.startOffset};
  } else if (typeof doc.caretPositionFromPoint === 'function') {
    const caretPosition = doc.caretPositionFromPoint(x, y);
    return caretPosition === null
      ? null
      : {node: caretPosition.offsetNode, offset: caretPosition.offset};
  }
  // Gracefully handle IE
  return null;
}
