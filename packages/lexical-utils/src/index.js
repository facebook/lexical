/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {ElementNode, LexicalNode} from 'lexical';

import {$getRoot, $isElementNode} from 'lexical';
import invariant from 'shared/invariant';

export type DFSNode = $ReadOnly<{
  depth: number,
  node: LexicalNode,
}>;

export function addClassNamesToElement(
  element: HTMLElement,
  ...classNames: Array<typeof undefined | boolean | null | string>
): void {
  classNames.forEach((className) => {
    if (typeof className === 'string') {
      element.classList.add(...className.split(' '));
    }
  });
}

export function removeClassNamesFromElement(
  element: HTMLElement,
  ...classNames: Array<string>
): void {
  classNames.forEach((className) => {
    if (typeof className === 'string') {
      element.classList.remove(...className.split(' '));
    }
  });
}

export function $dfs(
  startingNode?: LexicalNode,
  endingNode?: LexicalNode,
): Array<DFSNode> {
  const nodes = [];
  const start = (startingNode || $getRoot()).getLatest();
  const end =
    endingNode || ($isElementNode(start) ? start.getLastDescendant() : start);
  let node = start;
  let depth = $getDepth(node);
  while (node !== null && !node.is(end)) {
    nodes.push({depth, node});
    if ($isElementNode(node) && node.getChildrenSize() > 0) {
      node = node.getFirstChild();
      depth++;
    } else {
      // Find immediate sibling or nearest parent sibling
      let sibling = null;
      while (sibling === null && node !== null) {
        sibling = node.getNextSibling();
        if (sibling === null) {
          node = node.getParent();
          depth--;
        } else {
          node = sibling;
        }
      }
    }
  }
  if (node !== null && node.is(end)) {
    nodes.push({depth, node});
  }
  return nodes;
}

function $getDepth(node: LexicalNode): number {
  let node_ = node;
  let depth = 0;
  while ((node_ = node_.getParent()) !== null) {
    depth++;
  }
  return depth;
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

export function $getNearestBlockElementAncestorOrThrow(
  startNode: LexicalNode,
): ElementNode {
  const blockNode = $findMatchingParent(
    startNode,
    (node) => $isElementNode(node) && !node.isInline(),
  );
  if (!$isElementNode(blockNode)) {
    invariant(
      false,
      'Expected node %s to have closest block element node.',
      startNode.__key,
    );
  }
  return blockNode;
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

type Func = () => void;

export function mergeRegister(...func: Array<Func>): () => void {
  return () => {
    func.forEach((f) => f());
  };
}
