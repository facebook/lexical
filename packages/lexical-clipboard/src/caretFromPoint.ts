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

// Find the closest caret position at (x, y) by walking text nodes under
// `container`. Two-phase: pick the nearest text node via getClientRects(),
// then scan offsets within that single node. Vertical-first comparison
// prevents cross-line mispicks on wrapped spans and RTL/bidi text.
// Not a hot path (runs once per drag-drop).
function findTextOffsetAtPoint(
  x: number,
  y: number,
  container: Node,
  doc: Document,
): {node: Node; offset: number} | null {
  const range = doc.createRange();

  const vDist = (r: DOMRect) =>
    y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0;
  const hDist = (r: DOMRect) =>
    x < r.left ? r.left - x : x > r.right ? x - r.right : 0;

  // Phase 1: pick the nearest text node via one getClientRects() per node
  // (each returns its per-line fragments) so phase 2 scans a single node.
  const walker = doc.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let bestNode: Text | null = null;
  let bestV = Infinity;
  let bestH = Infinity;
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    range.selectNodeContents(n);
    for (const r of range.getClientRects()) {
      const v = vDist(r);
      const h = hDist(r);
      if (v < bestV || (v === bestV && h < bestH)) {
        bestV = v;
        bestH = h;
        bestNode = n as Text;
      }
    }
  }
  if (bestNode === null) {
    return null;
  }

  // Phase 2: closest caret offset within that node, vertical-first again
  // (so LTR and RTL both land on the right line).
  let bestOffset = 0;
  let offV = Infinity;
  let offH = Infinity;
  for (let i = 0; i <= bestNode.length; i++) {
    range.setStart(bestNode, i);
    range.collapse(true);
    const r = range.getBoundingClientRect();
    const v = vDist(r);
    const h = Math.abs(x - r.left);
    if (v < offV || (v === offV && h < offH)) {
      offV = v;
      offH = h;
      bestOffset = i;
    }
  }
  return {node: bestNode, offset: bestOffset};
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
        // `element` is inside the editor. If findTextOffsetAtPoint can't
        // resolve an offset (no text under the hit element — e.g. an empty
        // paragraph or a decorator/image block), an in-editor caret at
        // element/0 is a better drop target than the host-retargeted legacy
        // result below, which resolves outside rootElement.
        const result = findTextOffsetAtPoint(x, y, element, doc);
        return result !== null ? result : {node: element, offset: 0};
      }
      // The point missed the editor's shadow content (gutter/padding, slotted
      // content, or a sibling outside rootElement). Fall through to the legacy
      // caretRangeFromPoint path for a best-effort (host-level) caret rather
      // than dropping the interaction entirely.
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
