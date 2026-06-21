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
  isDOMShadowRoot,
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

// Find the closest caret position at (x, y) by walking text nodes
// under `container` and measuring each offset via a collapsed Range.
// Linear scan — not a hot path (runs once per drag-drop).
function findTextOffsetAtPoint(
  x: number,
  y: number,
  container: Node,
  doc: Document,
): {node: Node; offset: number} | null {
  const walker = doc.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let bestNode: Node | null = null;
  let bestOffset = 0;
  let bestDist = Infinity;
  const range = doc.createRange();
  let textNode: Node | null;
  while ((textNode = walker.nextNode()) !== null) {
    const len = textNode.textContent!.length;
    for (let i = 0; i <= len; i++) {
      range.setStart(textNode, i);
      range.collapse(true);
      const rect = range.getBoundingClientRect();
      const dist = Math.hypot(x - rect.left, y - (rect.top + rect.height / 2));
      if (dist < bestDist) {
        bestDist = dist;
        bestNode = textNode;
        bestOffset = i;
      }
    }
  }
  return bestNode !== null ? {node: bestNode, offset: bestOffset} : null;
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
  const doc = getRootOwnerDocument(rootElement);
  const shadowRoots = rootElement ? getDOMShadowRoots(rootElement) : [];
  const hasShadow = rootElement !== null && shadowRoots.length > 0;
  // caretPositionFromPoint with {shadowRoots} (Chrome 128+, Firefox 125+)
  // returns the un-retargeted node inside the shadow tree directly.
  if (hasShadow && typeof doc.caretPositionFromPoint === 'function') {
    const caretPosition = doc.caretPositionFromPoint(x, y, {shadowRoots});
    if (
      caretPosition !== null &&
      isWithinComposedTree(caretPosition.offsetNode, rootElement)
    ) {
      return {node: caretPosition.offsetNode, offset: caretPosition.offset};
    }
  }
  // Shadow fallback: caretRangeFromPoint retargets shadow-internal nodes
  // to the shadow host. Use shadowRoot.elementFromPoint to find the
  // correct element, then walk its text nodes to find the offset.
  // Also reached when caretPositionFromPoint exists but silently ignored
  // the {shadowRoots} option (older Chrome/Firefox).
  if (hasShadow) {
    const rootNode = rootElement.getRootNode();
    if (isDOMShadowRoot(rootNode)) {
      const element = rootNode.elementFromPoint(x, y);
      if (element !== null && rootElement.contains(element)) {
        const result = findTextOffsetAtPoint(x, y, element, doc);
        if (result !== null) {
          return result;
        }
        return {node: element, offset: 0};
      }
      return null;
    }
  }
  // Non-shadow path.
  if (typeof doc.caretRangeFromPoint === 'function') {
    const range = doc.caretRangeFromPoint(x, y);
    if (range === null) {
      return null;
    }
    return {node: range.startContainer, offset: range.startOffset};
  } else if (typeof doc.caretPositionFromPoint === 'function') {
    const caretPosition = doc.caretPositionFromPoint(x, y);
    if (caretPosition === null) {
      return null;
    }
    return {node: caretPosition.offsetNode, offset: caretPosition.offset};
  }
  return null;
}
