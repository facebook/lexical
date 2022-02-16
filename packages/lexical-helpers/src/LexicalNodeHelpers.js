/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalNode} from 'lexical';

import {$getRoot, $isElementNode, $isLineBreakNode, $isTextNode} from 'lexical';

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
