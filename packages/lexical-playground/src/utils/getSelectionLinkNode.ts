/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {$isLinkNode, type LinkNode} from '@lexical/link';
import {
  $findMatchingParent,
  $isLineBreakNode,
  type RangeSelection,
} from 'lexical';

import {$getSelectedNode} from './getSelectedNode';

export function $getSelectionLinkNode(
  selection: RangeSelection,
): LinkNode | null {
  // Preserve the existing endpoint-based behavior for text selections.
  // The link editor separately verifies that the whole range is in one link.
  const node = $getSelectedNode(selection);
  const parent = $findMatchingParent(node, $isLinkNode);
  if ($isLinkNode(parent)) {
    return parent;
  }
  if (selection.isCollapsed()) {
    return null;
  }

  // Element points can select a whole link through its containing paragraph
  // or root. Include those ancestors without treating unrelated content as
  // part of the link.
  const nodes = selection.getNodes();
  for (const selected of nodes) {
    const link = $findMatchingParent(selected, $isLinkNode);
    if ($isLinkNode(link)) {
      return nodes.every(
        selectedNode =>
          $isLineBreakNode(selectedNode) ||
          selectedNode.is(link) ||
          selectedNode.isParentOf(link) ||
          link.isParentOf(selectedNode),
      )
        ? link
        : null;
    }
  }
  return null;
}
