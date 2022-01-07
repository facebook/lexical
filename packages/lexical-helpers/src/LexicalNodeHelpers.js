/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {ListItemNode} from '@lexical/core/ListItemNode';
import type {LexicalNode} from '@lexical/core';
import type {ListNode} from '@lexical/core/ListNode';
import type {TableNode} from '@lexical/core/TableNode';

import {$isListNode} from '@lexical/core/ListNode';
import {$isListItemNode} from '@lexical/core/ListItemNode';
import invariant from 'shared/invariant';
import {
  $isElementNode,
  $createTextNode,
  $getRoot,
  $isLineBreakNode,
  $isTextNode,
} from '@lexical/core';
import {$createTableNode} from '@lexical/core/TableNode';
import {$createTableRowNode} from '@lexical/core/TableRowNode';
import {$createTableCellNode} from '@lexical/core/TableCellNode';

export function $dfs__DEPRECATED(
  startingNode: LexicalNode,
  nextNode: (LexicalNode) => null | LexicalNode,
): void {
  let node = startingNode;
  nextNode(node);
  while (node !== null) {
    if ($isElementNode(node) && node.getChildrenSize() > 0) {
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

export function $getNearestNodeOfType<T: LexicalNode>(
  node: LexicalNode,
  klass: Class<T>,
): T | null {
  let parent = node;
  while (parent != null) {
    if (parent instanceof klass) {
      return parent;
    }
    parent = parent.getParent();
  }
  return parent;
}

export type DOMNodeToLexicalConversion = (element: Node) => LexicalNode;
export type DOMNodeToLexicalConversionMap = {
  [string]: DOMNodeToLexicalConversion,
};

export function $createLexicalNodeFromDOMNode(
  node: Node,
  conversionMap: DOMNodeToLexicalConversionMap,
): LexicalNode | null {
  let lexicalNode: LexicalNode | null = null;
  const createFunction = conversionMap[node.nodeName.toLowerCase()];
  if (createFunction) {
    lexicalNode = createFunction(node);
    if ($isElementNode(lexicalNode)) {
      const children = node.childNodes;
      for (let i = 0; i < children.length; i++) {
        const child = $createLexicalNodeFromDOMNode(children[i], conversionMap);
        if (child !== null) {
          lexicalNode.append(child);
        }
      }
    }
  }
  return lexicalNode;
}

export function $createTableNodeWithDimensions(
  rowCount: number,
  columnCount: number,
  includeHeader?: boolean = true,
): TableNode {
  const tableNode = $createTableNode();

  for (let iRow = 0; iRow < rowCount; iRow++) {
    const tableRow = $createTableRowNode();

    for (let iColumn = 0; iColumn < columnCount; iColumn++) {
      const tableCell = $createTableCellNode(iRow === 0 && includeHeader);
      tableCell.append($createTextNode());
      tableRow.append(tableCell);
    }

    tableNode.append(tableRow);
  }

  return tableNode;
}

export function $findMatchingParent(
  startingNode: LexicalNode,
  findFn: (LexicalNode) => boolean,
): LexicalNode | null {
  let curr = startingNode;

  while (curr !== $getRoot() && curr != null) {
    if (findFn(curr)) {
      return curr;
    }

    curr = curr.getParent();
  }

  return null;
}

export function $areSiblingsNullOrSpace(node: LexicalNode): boolean {
  return $isPreviousSiblingNullOrSpace(node) && $isNextSiblingNullOrSpace(node);
}

export function $isPreviousSiblingNullOrSpace(node: LexicalNode): boolean {
  const previousSibling = node.getPreviousSibling();
  return (
    previousSibling === null ||
    $isLineBreakNode(previousSibling) ||
    ($isTextNode(previousSibling) &&
      previousSibling.isSimpleText() &&
      previousSibling.getTextContent().endsWith(' '))
  );
}

export function $isNextSiblingNullOrSpace(node: LexicalNode): boolean {
  const nextSibling = node.getNextSibling();
  return (
    nextSibling === null ||
    $isLineBreakNode(nextSibling) ||
    ($isTextNode(nextSibling) &&
      nextSibling.isSimpleText() &&
      nextSibling.getTextContent().startsWith(' '))
  );
}
