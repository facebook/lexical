/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {OutlineEditor, OutlineNode, View} from 'outline';

import {useCallback} from 'react';
import {isTextNode} from 'outline';
import {isListItemNode} from 'outline/ListItemNode';
import {createListNode, isListNode} from 'outline/ListNode';
import type {ListItemNode} from '../../outline/src/extensions/OutlineListItemNode';

function maybeIndentOrOutdent(
  editor: OutlineEditor,
  direction: 'indent' | 'outdent',
): boolean {
  let hasHandledIndention = false;
  editor.update((view: View) => {
    const selection = view.getSelection();
    const anchorNode = selection?.anchor.getNode();
    const anchorParentNode = anchorNode?.getParent();
    let nodes = selection?.getNodes() || [];
    // handle the case where user select the content of a single ListItemNode (assuming it's a TextNode for now)
    if (nodes?.length === 1 && isTextNode(nodes[0])) {
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

function nodesAreEqual(nodeA: ?OutlineNode, nodeB: ?OutlineNode): boolean {
  if (nodeA === null && nodeB === null) {
    return false;
  }
  return nodeA === nodeB || nodeA?.getKey() === nodeB?.getKey();
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
    // if the ListItemNode is next to a ListNode, merge them
    if (isListNode(nextSibling)) {
      nextSibling.getFirstChild()?.insertBefore(listItemNode);
    } else if (isListNode(previousSibling)) {
      previousSibling.append(listItemNode);
    } else {
      // otherwise, we need to create a new nested ListNode
      const parent = listItemNode.getParent();
      if (isListNode(parent)) {
        const newList = createListNode(parent.getTag());
        newList.append(listItemNode);
        if (previousSibling) {
          previousSibling.insertAfter(newList);
        } else if (nextSibling) {
          nextSibling.insertBefore(newList);
        } else {
          parent.append(newList);
        }
      }
    }
  });
}

function handleOutdent(listItemNodes: Array<ListItemNode>): void {
  // go through each node and decide where to move it.
  listItemNodes.forEach((listItemNode) => {
    const parentList = listItemNode.getParentOrThrow();
    const grandparentList = parentList.getParentOrThrow();
    // If it doesn't have a grandparent that's a ListNode, it's not indented.
    if (isListNode(grandparentList) && isListNode(parentList)) {
      // if it's the first child in it's parent list, insert it into the
      // grandparent list before the parent
      if (nodesAreEqual(listItemNode, parentList?.getFirstChild())) {
        parentList.insertBefore(listItemNode);
        if (parentList.getChildrenSize() === 0) {
          parentList.remove();
        }
        // if it's the last child in it's parent list, insert it into the
        // grandparent list after the parent.
      } else if (nodesAreEqual(listItemNode, parentList?.getLastChild())) {
        parentList.insertAfter(listItemNode);
        if (parentList.getChildrenSize() === 0) {
          parentList.remove();
        }
      } else {
        // otherwise, we need to split the siblings into two new lists
        const tag = parentList.getTag();
        const previousSiblingsList = createListNode(tag);
        listItemNode
          .getPreviousSiblings()
          .forEach((sibling) => previousSiblingsList.append(sibling));
        const nextSiblingsList = createListNode(tag);
        listItemNode
          .getNextSiblings()
          .forEach((sibling) => nextSiblingsList.append(sibling));
        // put the sibling lists on either side of the parent list in the grandparent.
        parentList.insertBefore(previousSiblingsList);
        parentList.insertAfter(nextSiblingsList);
        // replace the parent list (now between the siblings) with the outdented list item.
        parentList.replace(listItemNode);
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
  return [() => indent(editor), () => outdent(editor)];
}
