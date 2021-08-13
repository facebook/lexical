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

function maybeIndent(editor: OutlineEditor): boolean {
  let hasHandledIndention = false;
  editor.update((view: View) => {
    const selection = view.getSelection();
    const anchorNode = selection?.anchor.getNode();
    const anchorParentNode = anchorNode?.getParent();
    if (anchorNode != null && isListItemNode(anchorParentNode)) {
      indent([anchorNode]);
      hasHandledIndention = true;
    }
  }, 'useNestedList.maybeIndent');
  return hasHandledIndention;
}

function indent(selectedNodes: Array<OutlineNode>) {
  let nodes = selectedNodes;
  // handle the case where user select the content of a single ListItemNode (assumnig it's a TextNode for now)
  if (selectedNodes.length === 1 && isTextNode(selectedNodes[0])) {
    nodes = selectedNodes.map((node) => node.getParentBlockOrThrow());
  }
  // get all selected ListItemNodes
  const listItemNodes = nodes.filter((node) => isListItemNode(node));
  listItemNodes.forEach((listItemNode) => {
    const nextSibling = listItemNode.getNextSibling();
    const previousSibling = listItemNode.getPreviousSibling();
    // if the ListItemNode is next to a ListNode, merge them
    if (isListNode(nextSibling)) {
      nextSibling.getFirstChild()?.insertBefore(listItemNode);
    } else if (isListNode(previousSibling)) {
      listItemNode.remove();
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

export default function useNestedList(editor: OutlineEditor) {
  const handleKeydown = useCallback(
    (e: KeyboardEvent) => {
      // TAB
      if (e.keyCode === 9) {
        const hasHandledIndention = maybeIndent(editor);
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
}
