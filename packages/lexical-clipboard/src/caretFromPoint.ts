/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  getDOMShadowRoots,
  getParentElement,
  getRootOwnerDocument,
} from 'lexical';

// True when `node` is `rootElement` or a composed descendant of it, walking
// across shadow boundaries via getParentElement. A point retargeted to the
// shadow host resolves to an ancestor of rootElement, so it fails this check
// (the host is above rootElement, never below it).
function isWithinComposedTree(node: Node | null, rootElement: HTMLElement) {
  for (let current: Node | null = node; current !== null; ) {
    if (current === rootElement) {
      return true;
    }
    current = getParentElement(current);
  }
  return false;
}

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
  // actually resolved inside the editor's composed tree (covering slotted and
  // nested-shadow content, not only the enclosing roots) before trusting it;
  // otherwise fall through to the legacy paths below.
  const doc = getRootOwnerDocument(rootElement);
  const shadowRoots = rootElement ? getDOMShadowRoots(rootElement) : [];
  if (
    rootElement !== null &&
    shadowRoots.length > 0 &&
    typeof doc.caretPositionFromPoint === 'function'
  ) {
    const caretPosition = doc.caretPositionFromPoint(x, y, {shadowRoots});
    if (
      caretPosition !== null &&
      isWithinComposedTree(caretPosition.offsetNode, rootElement)
    ) {
      return {node: caretPosition.offsetNode, offset: caretPosition.offset};
    }
  }
  if (typeof doc.caretRangeFromPoint === 'function') {
    const range = doc.caretRangeFromPoint(x, y);
    if (range === null) {
      return null;
    }
    if (
      rootElement !== null &&
      shadowRoots.length > 0 &&
      !isWithinComposedTree(range.startContainer, rootElement)
    ) {
      return null;
    }
    return {node: range.startContainer, offset: range.startOffset};
  } else if (typeof doc.caretPositionFromPoint === 'function') {
    const caretPosition = doc.caretPositionFromPoint(x, y);
    if (caretPosition === null) {
      return null;
    }
    if (
      rootElement !== null &&
      shadowRoots.length > 0 &&
      !isWithinComposedTree(caretPosition.offsetNode, rootElement)
    ) {
      return null;
    }
    return {node: caretPosition.offsetNode, offset: caretPosition.offset};
  }
  // Gracefully handle IE
  return null;
}
