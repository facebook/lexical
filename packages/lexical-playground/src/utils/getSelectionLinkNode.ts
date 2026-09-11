/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {$isLinkNode, type LinkNode} from '@lexical/link';
import {
  $caretRangeFromSelection,
  $findMatchingParent,
  type CaretRange,
  type RangeSelection,
} from 'lexical';

import {$getSelectedNode} from './getSelectedNode';

function $findRangeLinkNode(range: CaretRange): LinkNode | null {
  for (const {origin} of range) {
    const link = $findMatchingParent(origin, $isLinkNode);
    if (link !== null) {
      return link;
    }
  }
  return null;
}

/**
 * Resolve the {@link LinkNode} a selection refers to, or `null` when it does
 * not refer to exactly one.
 *
 * A text selection resolves from its endpoint, which keeps the right-biased
 * lookup that lets an adjacent single-character link win. A non-collapsed
 * selection made of element points — how some browsers represent select-all —
 * additionally resolves a link that the range covers through an ancestor such
 * as the containing paragraph or the root.
 */
export function $getSelectionLinkNode(
  selection: RangeSelection,
): LinkNode | null {
  // Preserve the existing endpoint-based behavior for text selections.
  // The link editor separately verifies that the whole range is in one link.
  const parent = $findMatchingParent($getSelectedNode(selection), $isLinkNode);
  if (parent !== null) {
    return parent;
  }
  if (selection.isCollapsed()) {
    return null;
  }

  // Walk the range once to find the link it enters, then once more to confirm
  // it covers nothing else: every node the walk visits has to be the link, one
  // of its ancestors, or one of its descendants. Both walks are lazy and stop
  // as soon as the answer is known.
  const range = $caretRangeFromSelection(selection);
  const link = $findRangeLinkNode(range);
  if (link === null) {
    return null;
  }
  for (const {origin} of range) {
    if (
      !link.is(origin) &&
      !link.isParentOf(origin) &&
      !origin.isParentOf(link)
    ) {
      return null;
    }
  }
  return link;
}
