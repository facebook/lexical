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
  // Replace artificial node with its children, inserting a linebreak
  // between adjacent artificial nodes
  for (const node of allArtificialNodes) {
    if (
      node.getParent() &&
      node.getNextSibling() instanceof ArtificialNode__DO_NOT_USE
    ) {
      node.insertAfter($createLineBreakNode());
    }
  }
  for (const node of allArtificialNodes) {
    const parent = node.getParent();
    if (parent) {
      parent.splice(node.getIndexWithinParent(), 1, node.getChildren());
    }
  }
}
