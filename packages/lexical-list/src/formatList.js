/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalEditor, ElementNode} from 'lexical';
import type {ListNode} from '@lexical/list';
import {
  $getSelection,
  $log,
  $isLeafNode,
  $isRootNode,
  $isElementNode,
  $createParagraphNode,
} from 'lexical';
import {
  $createListItemNode,
  $isListItemNode,
  ListItemNode,
  $createListNode,
  $isListNode,
} from '@lexical/list';
import {
  $getAllListItems,
  $getTopListNode,
  getUniqueListItemNodes,
  findNearestListItemNode,
  isNestedListNode,
} from './utils';
import {$getNearestNodeOfType} from '@lexical/helpers/nodes';

export function insertList(editor: LexicalEditor, listType: 'ul' | 'ol'): void {
  editor.update(() => {
    $log('formatList');
    const selection = $getSelection();
    if (selection !== null) {
      const nodes = selection.getNodes();
      const anchor = selection.anchor;
      const anchorNode = anchor.getNode();
      const anchorNodeParent = anchorNode.getParent();
      // This is a special case for when there's nothing selected
      if (nodes.length === 0) {
        const list = $createListNode(listType);
        if ($isRootNode(anchorNodeParent)) {
          anchorNode.replace(list);
          const listItem = $createListItemNode();
          list.append(listItem);
        } else if ($isListItemNode(anchorNode)) {
          const parent = anchorNode.getParentOrThrow();
          list.append(...parent.getChildren());
          parent.replace(list);
        }
        return;
      } else {
        const handled = new Set();
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i];
          if (
            $isElementNode(node) &&
            node.isEmpty() &&
            !handled.has(node.getKey())
          ) {
            createListOrMerge(node, listType);
            continue;
          }
          if ($isLeafNode(node)) {
            let parent = node.getParent();
            while (parent != null) {
              const parentKey = parent.getKey();
              if ($isListNode(parent)) {
                if (!handled.has(parentKey)) {
                  const newListNode = $createListNode(listType);
                  newListNode.append(...parent.getChildren());
                  parent.replace(newListNode);
                  handled.add(parentKey);
                }
                break;
              } else {
                const nextParent = parent.getParent();
                if ($isRootNode(nextParent) && !handled.has(parentKey)) {
                  handled.add(parentKey);
                  createListOrMerge(parent, listType);
                  break;
                }
                parent = nextParent;
              }
            }
          }
        }
      }
    }
  });
}

function createListOrMerge(node: ElementNode, listType: 'ul' | 'ol'): ListNode {
  if ($isListNode(node)) {
    return node;
  }
  const previousSibling = node.getPreviousSibling();
  const nextSibling = node.getNextSibling();
  const listItem = $createListItemNode();
  if ($isListNode(previousSibling) && listType === previousSibling.getTag()) {
    listItem.append(node);
    previousSibling.append(listItem);
    // if the same type of list is on both sides, merge them.
    if ($isListNode(nextSibling) && listType === nextSibling.getTag()) {
      previousSibling.append(...nextSibling.getChildren());
      nextSibling.remove();
    }
    return previousSibling;
  } else if ($isListNode(nextSibling) && listType === nextSibling.getTag()) {
    listItem.append(node);
    nextSibling.getFirstChildOrThrow().insertBefore(listItem);
    return nextSibling;
  } else {
    const list = $createListNode(listType);
    list.append(listItem);
    node.replace(list);
    listItem.append(node);
    return list;
  }
}

export function removeList(editor: LexicalEditor): void {
  editor.update(() => {
    $log('removeList');
    const selection = $getSelection();
    if (selection !== null) {
      const listNodes = new Set();
      const nodes = selection.getNodes();
      const anchorNode = selection.anchor.getNode();
      if (nodes.length === 0 && $isListItemNode(anchorNode)) {
        listNodes.add($getTopListNode(anchorNode));
      } else {
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i];
          if ($isLeafNode(node)) {
            const listItemNode = $getNearestNodeOfType(node, ListItemNode);
            if (listItemNode != null) {
              listNodes.add($getTopListNode(listItemNode));
            }
          }
        }
      }
      listNodes.forEach((listNode) => {
        let insertionPoint = listNode;
        const listItems = $getAllListItems(listNode);
        listItems.forEach((listItemNode) => {
          if (listItemNode != null) {
            const paragraph = $createParagraphNode();
            paragraph.append(...listItemNode.getChildren());
            insertionPoint.insertAfter(paragraph);
            insertionPoint = paragraph;
            listItemNode.remove();
          }
        });
        listNode.remove();
      });
    }
  });
}

function handleIndent(listItemNodes: Array<ListItemNode>): void {
  // go through each node and decide where to move it.
  listItemNodes.forEach((listItemNode) => {
    if (isNestedListNode(listItemNode)) {
      return;
    }
    const parent = listItemNode.getParent();
    const nextSibling = listItemNode.getNextSibling();
    const previousSibling = listItemNode.getPreviousSibling();
    // if there are nested lists on either side, merge them all together.
    if (isNestedListNode(nextSibling) && isNestedListNode(previousSibling)) {
      const innerList = previousSibling.getFirstChild();
      if ($isListNode(innerList)) {
        innerList.append(listItemNode);
        const nextInnerList = nextSibling.getFirstChild();
        if ($isListNode(nextInnerList)) {
          const children = nextInnerList.getChildren();
          innerList.append(...children);
          nextInnerList.remove();
        }
        innerList.getChildren().forEach((child) => child.markDirty());
      }
    } else if (isNestedListNode(nextSibling)) {
      // if the ListItemNode is next to a nested ListNode, merge them
      const innerList = nextSibling.getFirstChild();
      if ($isListNode(innerList)) {
        const firstChild = innerList.getFirstChild();
        if (firstChild !== null) {
          firstChild.insertBefore(listItemNode);
        }
        innerList.getChildren().forEach((child) => child.markDirty());
      }
    } else if (isNestedListNode(previousSibling)) {
      const innerList = previousSibling.getFirstChild();
      if ($isListNode(innerList)) {
        innerList.append(listItemNode);
        innerList.getChildren().forEach((child) => child.markDirty());
      }
    } else {
      // otherwise, we need to create a new nested ListNode
      if ($isListNode(parent)) {
        const newListItem = $createListItemNode();
        const newList = $createListNode(parent.getTag());
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
    if ($isListNode(parent)) {
      parent.getChildren().forEach((child) => child.markDirty());
    }
  });
}

function handleOutdent(listItemNodes: Array<ListItemNode>): void {
  // go through each node and decide where to move it.
  listItemNodes.forEach((listItemNode) => {
    if (isNestedListNode(listItemNode)) {
      return;
    }
    const parentList = listItemNode.getParent();
    const grandparentListItem = parentList ? parentList.getParent() : undefined;
    const greatGrandparentList = grandparentListItem
      ? grandparentListItem.getParent()
      : undefined;
    // If it doesn't have these ancestors, it's not indented.
    if (
      $isListNode(greatGrandparentList) &&
      $isListItemNode(grandparentListItem) &&
      $isListNode(parentList)
    ) {
      // if it's the first child in it's parent list, insert it into the
      // great grandparent list before the grandparent
      const firstChild = parentList ? parentList.getFirstChild() : undefined;
      const lastChild = parentList ? parentList.getLastChild() : undefined;
      if (listItemNode.is(firstChild)) {
        grandparentListItem.insertBefore(listItemNode);
        if (parentList.isEmpty()) {
          grandparentListItem.remove();
        }
        // if it's the last child in it's parent list, insert it into the
        // great grandparent list after the grandparent.
      } else if (listItemNode.is(lastChild)) {
        grandparentListItem.insertAfter(listItemNode);
        if (parentList.isEmpty()) {
          grandparentListItem.remove();
        }
      } else {
        // otherwise, we need to split the siblings into two new nested lists
        const tag = parentList.getTag();
        const previousSiblingsListItem = $createListItemNode();
        const previousSiblingsList = $createListNode(tag);
        previousSiblingsListItem.append(previousSiblingsList);
        listItemNode
          .getPreviousSiblings()
          .forEach((sibling) => previousSiblingsList.append(sibling));
        const nextSiblingsListItem = $createListItemNode();
        const nextSiblingsList = $createListNode(tag);
        nextSiblingsListItem.append(nextSiblingsList);
        nextSiblingsList.append(...listItemNode.getNextSiblings());
        // put the sibling nested lists on either side of the grandparent list item in the great grandparent.
        grandparentListItem.insertBefore(previousSiblingsListItem);
        grandparentListItem.insertAfter(nextSiblingsListItem);
        // replace the grandparent list item (now between the siblings) with the outdented list item.
        grandparentListItem.replace(listItemNode);
      }
      parentList.getChildren().forEach((child) => child.markDirty());
      greatGrandparentList.getChildren().forEach((child) => child.markDirty());
    }
  });
}

function maybeIndentOrOutdent(direction: 'indent' | 'outdent'): boolean {
  const selection = $getSelection();
  if (selection === null) {
    return false;
  }
  const selectedNodes = selection.getNodes();
  let listItemNodes = [];
  if (selectedNodes.length === 0) {
    selectedNodes.push(selection.anchor.getNode());
  }
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
    return true;
  }
  return false;
}

export function indentList(): boolean {
  return maybeIndentOrOutdent('indent');
}

export function outdentList(): boolean {
  return maybeIndentOrOutdent('outdent');
}
