/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalNode} from 'lexical';

import invariant from 'shared/invariant';

import {
  $createListItemNode,
  $isListItemNode,
  $isListNode,
  ListItemNode,
  ListNode,
} from './';

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

export function $getTopListNode(listItem: LexicalNode): ListNode {
  let list = listItem.getParent<ListNode>();

  if (!$isListNode(list)) {
    invariant(false, 'A ListItemNode must have a ListNode for a parent.');
  }

  let parent: ListNode | null = list;

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
  let parent: ListItemNode | null = listItem;

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

export function isNestedListNode(
  node: LexicalNode | null | undefined,
): boolean {
  return $isListItemNode(node) && $isListNode(node.getFirstChild());
}

// TODO: rewrite with $findMatchingParent or *nodeOfType
export function findNearestListItemNode(
  node: LexicalNode,
): ListItemNode | null {
  let currentNode: LexicalNode | null = node;

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

export function $removeHighestEmptyListParent(
  sublist: ListItemNode | ListNode,
) {
  // Nodes may be repeatedly indented, to create deeply nested lists that each
  // contain just one bullet.
  // Our goal is to remove these (empty) deeply nested lists. The easiest
  // way to do that is crawl back up the tree until we find a node that has siblings
  // (e.g. is actually part of the list contents) and delete that, or delete
  // the root of the list (if no list nodes have siblings.)
  let emptyListPtr = sublist;

  while (
    emptyListPtr.getNextSibling() == null &&
    emptyListPtr.getPreviousSibling() == null
  ) {
    const parent = emptyListPtr.getParent<ListItemNode | ListNode>();

    if (
      parent == null ||
      !($isListItemNode(emptyListPtr) || $isListNode(emptyListPtr))
    ) {
      break;
    }

    emptyListPtr = parent;
  }

  emptyListPtr.remove();
}

export function wrapInListItem(node: LexicalNode): ListItemNode {
  const listItemWrapper = $createListItemNode();
  return listItemWrapper.append(node);
}
