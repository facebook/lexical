/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {OutlineEditor, OutlineNode, View} from 'outline';
import type {ListItemNode} from 'outline/ListItemNode';
import {useCallback, useMemo} from 'react';
import {createListItemNode, isListItemNode} from 'outline/ListItemNode';
import {createListNode, isListNode} from 'outline/ListNode';

function maybeIndentOrOutdent(
  editor: OutlineEditor,
  direction: 'indent' | 'outdent',
): boolean {
  let hasHandledIndention = false;
  editor.update((view: View) => {
    const selection = view.getSelection();
    if (selection === null) {
      return;
    }
    const selectedNodes = selection.getNodes() || [];
    let listItemNodes = [];
    if (selectedNodes.length === 1) {
      // Only 1 node selected. Selection may not contain the ListNodeItem so we traverse the tree to
      // find whether this is part of a ListItemNode
      const nearestListItemNode = findNearestListItemNode(selectedNodes[0]);
      if (nearestListItemNode !== null) {
        listItemNodes = [nearestListItemNode];
      }
    } else {
      listItemNodes = getUniqueListItemNodes(selectedNodes);
    }
    if (listItemNodes.length > 0) {
      if (direction === 'indent') {
        handleIndent(listItemNodes);
      } else {
        handleOutdent(listItemNodes);
      }
      hasHandledIndention = true;
    }
  }, 'useNestedList.maybeIndent');
  return hasHandledIndention;
}

function isNestedListNode(node: ?OutlineNode): boolean %checks {
  return isListItemNode(node) && isListNode(node.getFirstChild());
}

function findNearestListItemNode(node: OutlineNode): ListItemNode | null {
  let currentNode = node;
  while (currentNode !== null) {
    if (isListItemNode(currentNode)) {
      return currentNode;
    }
    currentNode = currentNode.getParent();
  }
  return null;
}

function getUniqueListItemNodes(
  nodeList: Array<OutlineNode>,
): Array<ListItemNode> {
  const keys = new Set<ListItemNode>();
  for (let i = 0; i < nodeList.length; i++) {
    const node = nodeList[i];
    if (isListItemNode(node)) {
      keys.add(node);
    }
  }
  return Array.from(keys);
}

function handleIndent(listItemNodes: Array<ListItemNode>): void {
  // go through each node and decide where to move it.
  listItemNodes.forEach((listItemNode) => {
    const nextSibling = listItemNode.getNextSibling();
    const previousSibling = listItemNode.getPreviousSibling();
    // if the ListItemNode is next to a nested ListNode, merge them
    if (isNestedListNode(nextSibling)) {
      const innerList = nextSibling.getFirstChild();
      if (isListNode(innerList)) {
        const firstChild = innerList.getFirstChild();
        if (firstChild !== null) {
          firstChild.insertBefore(listItemNode);
        }
      }
    } else if (isNestedListNode(previousSibling)) {
      const innerList = previousSibling.getFirstChild();
      if (isListNode(innerList)) {
        innerList.append(listItemNode);
      }
    } else {
      // otherwise, we need to create a new nested ListNode
      const parent = listItemNode.getParent();
      if (isListNode(parent)) {
        const newListItem = createListItemNode();
        const newList = createListNode(parent.getTag());
        newListItem.append(newList);
        newList.append(listItemNode);
        if (previousSibling) {
          previousSibling.insertAfter(newListItem);
        } else if (nextSibling) {
          nextSibling.insertBefore(newListItem);
        } else {
          parent.append(newListItem);
        }
      }
    }
  });
}

function handleOutdent(listItemNodes: Array<ListItemNode>): void {
  // go through each node and decide where to move it.
  listItemNodes.forEach((listItemNode) => {
    const parentList = listItemNode.getParent();
    const grandparentListItem = parentList ? parentList.getParent() : undefined;
    const greatGrandparentList = grandparentListItem
      ? grandparentListItem.getParent()
      : undefined;
    // If it doesn't have these ancestors, it's not indented.
    if (
      isListNode(greatGrandparentList) &&
      isListItemNode(grandparentListItem) &&
      isListNode(parentList)
    ) {
      // if it's the first child in it's parent list, insert it into the
      // great grandparent list before the grandparent
      const firstChild = parentList ? parentList.getFirstChild() : undefined;
      const lastChild = parentList ? parentList.getLastChild() : undefined;
      if (listItemNode.is(firstChild)) {
        grandparentListItem.insertBefore(listItemNode);
        if (parentList.getChildrenSize() === 0) {
          grandparentListItem.remove();
        }
        // if it's the last child in it's parent list, insert it into the
        // great grandparent list after the grandparent.
      } else if (listItemNode.is(lastChild)) {
        grandparentListItem.insertAfter(listItemNode);
        if (parentList.getChildrenSize() === 0) {
          grandparentListItem.remove();
        }
      } else {
        // otherwise, we need to split the siblings into two new nested lists
        const tag = parentList.getTag();
        const previousSiblingsListItem = createListItemNode();
        const previousSiblingsList = createListNode(tag);
        previousSiblingsListItem.append(previousSiblingsList);
        listItemNode
          .getPreviousSiblings()
          .forEach((sibling) => previousSiblingsList.append(sibling));
        const nextSiblingsListItem = createListItemNode();
        const nextSiblingsList = createListNode(tag);
        nextSiblingsListItem.append(nextSiblingsList);
        nextSiblingsList.append(...listItemNode.getNextSiblings());
        // put the sibling nested lists on either side of the grandparent list item in the great grandparent.
        grandparentListItem.insertBefore(previousSiblingsListItem);
        grandparentListItem.insertAfter(nextSiblingsListItem);
        // replace the grandparent list item (now between the siblings) with the outdented list item.
        grandparentListItem.replace(listItemNode);
      }
    }
  });
}

function indent(editor: OutlineEditor): void {
  maybeIndentOrOutdent(editor, 'indent');
}

function outdent(editor: OutlineEditor): void {
  maybeIndentOrOutdent(editor, 'outdent');
}

export default function useOutlineNestedList(
  editor: OutlineEditor,
): [() => void, () => void] {
  const handleKeydown = useCallback(
    (e: KeyboardEvent) => {
      // TAB
      if (e.keyCode === 9) {
        const direction = e.shiftKey ? 'outdent' : 'indent';
        const hasHandledIndention = maybeIndentOrOutdent(editor, direction);
        if (hasHandledIndention) {
          e.preventDefault();
        }
      }
    },
    [editor],
  );

  editor.addListener(
    'root',
    (rootElement: null | HTMLElement, prevRootElement: null | HTMLElement) => {
      if (prevRootElement !== null) {
        prevRootElement.removeEventListener('keydown', handleKeydown);
      }
      if (rootElement !== null) {
        rootElement.addEventListener('keydown', handleKeydown);
      }
    },
  );
  return useMemo(() => [() => indent(editor), () => outdent(editor)], [editor]);
}
