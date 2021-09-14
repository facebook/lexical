/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {OutlineEditor, OutlineNode, View} from 'outline';

import {useCallback, useMemo} from 'react';
import {isTextNode} from 'outline';
import {
  ListItemNode,
  createListItemNode,
  isListItemNode,
} from 'outline/ListItemNode';
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
    const anchor = selection.anchor;
    const anchorNode = anchor.getNode();
    const anchorParentNode =
      anchor.type === 'text' ? anchorNode.getParent() : anchorNode;
    let nodes = selection.getNodes() || [];
    // handle the case where user select the content of a single ListItemNode (assuming it's a TextNode for now)
    if (nodes.length === 1 && isTextNode(nodes[0])) {
      nodes = [nodes[0].getParentBlockOrThrow()];
    }
    nodes = getUniqueListItemNodes(nodes);
    if (anchorNode != null && isListItemNode(anchorParentNode)) {
      direction === 'indent' ? handleIndent(nodes) : handleOutdent(nodes);
      hasHandledIndention = true;
    }
  }, 'useNestedList.maybeIndent');
  return hasHandledIndention;
}

function isNestedListNode(node: ?OutlineNode): boolean %checks {
  return isListItemNode(node) && isListNode(node.getFirstChild());
}

function getUniqueListItemNodes(
  nodeList: Array<OutlineNode>,
): Array<ListItemNode> {
  const keys = new Set();
  //$FlowFixMe this definitely returns ListItemNodes
  return nodeList.filter((node) => {
    const key = node.getKey();
    if (keys.has(key)) {
      return false;
    }
    keys.add(key);
    return isListItemNode(node);
  });
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
        innerList.getFirstChild()?.insertBefore(listItemNode);
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
    const grandparentListItem = parentList?.getParent();
    const greatGrandparentList = grandparentListItem?.getParent();
    // If it doesn't have these ancestors, it's not indented.
    if (
      isListNode(greatGrandparentList) &&
      isListItemNode(grandparentListItem) &&
      isListNode(parentList)
    ) {
      // if it's the first child in it's parent list, insert it into the
      // great grandparent list before the grandparent
      if (listItemNode.is(parentList?.getFirstChild())) {
        grandparentListItem.insertBefore(listItemNode);
        if (parentList.getChildrenSize() === 0) {
          grandparentListItem.remove();
        }
        // if it's the last child in it's parent list, insert it into the
        // great grandparent list after the grandparent.
      } else if (listItemNode.is(parentList?.getLastChild())) {
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
        listItemNode
          .getNextSiblings()
          .forEach((sibling) => nextSiblingsList.append(sibling));
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

export default function useNestedList(
  editor: OutlineEditor,
): [() => void, () => void] {
  const handleKeydown = useCallback(
    (e: KeyboardEvent) => {
      // TAB
      if (e.keyCode === 9) {
        let direction = e.shiftKey ? 'outdent' : 'indent';
        let hasHandledIndention = maybeIndentOrOutdent(editor, direction);
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
