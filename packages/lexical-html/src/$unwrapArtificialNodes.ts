/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {$createLineBreakNode, ArtificialNode__DO_NOT_USE} from 'lexical';

export function $unwrapArtificialNodes(
  allArtificialNodes: Array<ArtificialNode__DO_NOT_USE>,
) {
  for (const node of allArtificialNodes) {
    if (node.getParent()) {
      if (node.getNextSibling() instanceof ArtificialNode__DO_NOT_USE) {
        node.insertAfter($createLineBreakNode());
      }
    }
  }
  // Replace artificial node with it's children
  for (const node of allArtificialNodes) {
    if (node.getParent()) {
      node.getIndexWithinParent();
      const children = node.getChildren();
      for (const child of children) {
        node.insertBefore(child);
      }
      node.remove();
    }
  }
}
