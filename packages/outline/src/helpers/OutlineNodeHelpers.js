/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineNode, BlockNode} from 'outline';

import {isBlockNode} from 'outline';

export function dfs(
  startingNode: OutlineNode,
  nextNode: (OutlineNode) => null | OutlineNode,
) {
  let node = startingNode;
  nextNode(node);
  while (node !== null) {
    if (isBlockNode(node) && node.getChildrenSize() > 0) {
      node = node.getFirstChild();
    } else {
      // Find immediate sibling or nearest parent sibling
      let sibling = null;
      while (sibling === null && node !== null) {
        sibling = node.getNextSibling();
        if (sibling === null) {
          node = node.getParent();
        } else {
          node = sibling;
        }
      }
    }
    if (node !== null) {
      node = nextNode(node);
    }
  }
}

export function getCommonAncestor(nodes: OutlineNode[]): null | BlockNode {
  let commonAncestor = nodes[0].getParent();
  const nodesLength = nodes.length;
  for (let i = 1; i < nodesLength; i++) {
    if (commonAncestor === null) {
      return null;
    }
    // Flow -- an ancestor always has a child
    const ancestorFirstChild = commonAncestor.getFirstChild();
    if (ancestorFirstChild !== null) {
      commonAncestor = ancestorFirstChild.getCommonAncestor(nodes[i]);
    }
  }
  return commonAncestor;
}
