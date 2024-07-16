/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalNode, Spread} from 'lexical';

import {$findMatchingParent} from '@lexical/utils';
import invariant from 'shared/invariant';

import {
  $createListItemNode,
  $isListItemNode,
  $isListNode,
  ListItemNode,
  ListNode,
} from './';

/**
 * Checks the depth of listNode from the root node.
 * @param listNode - The ListNode to be checked.
 * @returns The depth of the ListNode.
 */
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

/**
 * Finds the nearest ancestral ListNode and returns it, throws an invariant if listItem is not a ListItemNode.
 * @param listItem - The node to be checked.
 * @returns The ListNode found.
 */
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

/**
 * Checks if listItem has no child ListNodes and has no ListItemNode ancestors with siblings.
 * @param listItem - the ListItemNode to be checked.
 * @returns true if listItem has no child ListNode and no ListItemNode ancestors with siblings, false otherwise.
 */
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

/**
 * A recursive Depth-First Search (Postorder Traversal) that finds all of a node's children
 * that are of type ListItemNode and returns them in an array.
 * @param node - The ListNode to start the search.
 * @returns An array containing all nodes of type ListItemNode found.
 */
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

const NestedListNodeBrand: unique symbol = Symbol.for(
  '@lexical/NestedListNodeBrand',
);

/**
 * Checks to see if the passed node is a ListItemNode and has a ListNode as a child.
 * @param node - The node to be checked.
 * @returns true if the node is a ListItemNode and has a ListNode child, false otherwise.
 */
export function isNestedListNode(
  node: LexicalNode | null | undefined,
): node is Spread<
  {getFirstChild(): ListNode; [NestedListNodeBrand]: never},
  ListItemNode
> {
  return $isListItemNode(node) && $isListNode(node.getFirstChild());
}

/**
 * Traverses up the tree and returns the first ListItemNode found.
 * @param node - Node to start the search.
 * @returns The first ListItemNode found, or null if none exist.
 */
export function $findNearestListItemNode(
  node: LexicalNode,
): ListItemNode | null {
  const matchingParent = $findMatchingParent(node, (parent) =>
    $isListItemNode(parent),
  );
  return matchingParent as ListItemNode | null;
}

/**
 * Takes a deeply nested ListNode or ListItemNode and traverses up the branch to delete the first
 * ancestral ListNode (which could be the root ListNode) or ListItemNode with siblings, essentially
 * bringing the deeply nested node up the branch once. Would remove sublist if it has siblings.
 * Should not break ListItem -> List -> ListItem chain as empty List/ItemNodes should be removed on .remove().
 * @param sublist - The nested ListNode or ListItemNode to be brought up the branch.
 */
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

/**
 * Wraps a node into a ListItemNode.
 * @param node - The node to be wrapped into a ListItemNode
 * @returns The ListItemNode which the passed node is wrapped in.
 */
export function $wrapInListItem(node: LexicalNode): ListItemNode {
  const listItemWrapper = $createListItemNode();
  return listItemWrapper.append(node);
}
