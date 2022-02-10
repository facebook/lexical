/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalNode} from 'lexical';
import type {ListNode} from '@lexical/list';
import {ListItemNode, $isListNode, $isListItemNode} from '@lexical/list';
import invariant from 'shared/invariant';

export function $getListDepth(listNode: ListNode): number {
  let depth = 1;
  let parent = listNode.getParent();
  while (parent != null) {
    if ($isListItemNode(parent)) {
      const parentList = parent.getParent();
      if ($isListNode(parentList)) {
        depth++;
        parent = parentList.getParent();
        continue;
      }
      invariant(false, 'A ListItemNode must have a ListNode for a parent.');
    }
    return depth;
  }
  return depth;
}

export function $getTopListNode(listItem: ListItemNode): ListNode {
  let list = listItem.getParent();
  if (!$isListNode(list)) {
    invariant(false, 'A ListItemNode must have a ListNode for a parent.');
  }
  let parent = list;
  while (parent !== null) {
    parent = parent.getParent();
    if ($isListNode(parent)) {
      list = parent;
    }
  }
  return list;
}

export function $isLastItemInList(listItem: ListItemNode): boolean {
  let isLast = true;
  const firstChild = listItem.getFirstChild();
  if ($isListNode(firstChild)) {
    return false;
  }
  let parent = listItem;
  while (parent !== null) {
    if ($isListItemNode(parent)) {
      if (parent.getNextSiblings().length > 0) {
        isLast = false;
      }
    }
    parent = parent.getParent();
  }
  return isLast;
}

// This should probably be $getAllChildrenOfType
export function $getAllListItems(node: ListNode): Array<ListItemNode> {
  let listItemNodes: Array<ListItemNode> = [];
  //$FlowFixMe - the result of this will always be an array of ListItemNodes.
  const listChildren: Array<ListItemNode> = node
    .getChildren()
    .filter($isListItemNode);
  for (let i = 0; i < listChildren.length; i++) {
    const listItemNode = listChildren[i];
    const firstChild = listItemNode.getFirstChild();
    if ($isListNode(firstChild)) {
      listItemNodes = listItemNodes.concat($getAllListItems(firstChild));
    } else {
      listItemNodes.push(listItemNode);
    }
  }
  return listItemNodes;
}

export function isNestedListNode(node: ?LexicalNode): boolean %checks {
  return $isListItemNode(node) && $isListNode(node.getFirstChild());
}

export function findNearestListItemNode(
  node: LexicalNode,
): ListItemNode | null {
  let currentNode = node;
  while (currentNode !== null) {
    if ($isListItemNode(currentNode)) {
      return currentNode;
    }
    currentNode = currentNode.getParent();
  }
  return null;
}

export function getUniqueListItemNodes(
  nodeList: Array<LexicalNode>,
): Array<ListItemNode> {
  const keys = new Set<ListItemNode>();
  for (let i = 0; i < nodeList.length; i++) {
    const node = nodeList[i];
    if ($isListItemNode(node)) {
      keys.add(node);
    }
  }
  return Array.from(keys);
}
