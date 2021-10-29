/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {ListItemNode} from 'outline/ListItemNode';
import type {OutlineNode, BlockNode} from 'outline';
import type {ListNode} from 'outline/ListNode';

import {isListNode} from 'outline/ListNode';
import {isListItemNode} from 'outline/ListItemNode';
import invariant from 'shared/invariant';
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

export function getTopListNode(listItem: ListItemNode): ListNode {
  let list = listItem.getParent();
  if (!isListNode(list)) {
    invariant(false, 'A ListItemNode must have a ListNode for a parent.');
  }
  let parent = list;
  while (parent !== null) {
    parent = parent.getParent();
    if (isListNode(parent)) {
      list = parent;
    }
  }
  return list;
}

export function isLastItemInList(listItem: ListItemNode): boolean {
  let isLast = true;
  const firstChild = listItem.getFirstChild();
  if (isListNode(firstChild)) {
    return false;
  }
  let parent = listItem;
  while (parent !== null) {
    if (isListItemNode(parent)) {
      if (parent.getNextSiblings().length > 0) {
        isLast = false;
      }
    }
    parent = parent.getParent();
  }
  return isLast;
}
