/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {ElementNode, LexicalEditor, LexicalNode} from 'lexical';

import {$getRoot, $isElementNode} from 'lexical';
import invariant from 'shared/invariant';
import {Class} from 'utility-types';

export type DFSNode = Readonly<{
  depth: number;
  node: LexicalNode;
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

export function $getNearestNodeOfType<T extends ElementNode>(
  node: T,
  klass: Class<T>,
): T | null {
  let parent = node;

  while (parent != null) {
    if (parent instanceof klass) {
      return parent;
    }

    parent = parent.getParent<T>();
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

export type DOMNodeToLexicalConversionMap = Record<
  string,
  DOMNodeToLexicalConversion
>;

export function $findMatchingParent(
  startingNode: LexicalNode,
  findFn: (node: LexicalNode) => boolean,
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

export function registerNestedElementResolver<N extends ElementNode>(
  editor: LexicalEditor,
  targetNode: Class<N>,
  cloneNode: (from: N) => N,
  handleOverlap: (from: N, to: N) => void,
): () => void {
  const $isTargetNode = (node: LexicalNode | null | undefined): node is N => {
    return node instanceof targetNode;
  };

  const $findMatch = (node: N): {child: ElementNode; parent: N} | null => {
    // First validate we don't have any children that are of the target,
    // as we need to handle them first.
    const children = node.getChildren();

    for (let i = 0; i < children.length; i++) {
      const child = children[i];

      if ($isTargetNode(child)) {
        return null;
      }
    }

    let parentNode = node;
    let childNode = node;

    while (parentNode !== null) {
      childNode = parentNode;
      parentNode = parentNode.getParent();

      if ($isTargetNode(parentNode)) {
        return {child: childNode, parent: parentNode};
      }
    }

    return null;
  };

  const elementNodeTransform = (node: N) => {
    const match = $findMatch(node);

    if (match !== null) {
      const {child, parent} = match;

      // Simple path, we can move child out and siblings into a new parent.

      if (child.is(node)) {
        handleOverlap(parent, node);
        const nextSiblings = child.getNextSiblings();
        const nextSiblingsLength = nextSiblings.length;
        parent.insertAfter(child);

        if (nextSiblingsLength !== 0) {
          const newParent = cloneNode(parent);
          child.insertAfter(newParent);

          for (let i = 0; i < nextSiblingsLength; i++) {
            newParent.append(nextSiblings[i]);
          }
        }

        if (!parent.canBeEmpty() && parent.getChildrenSize() === 0) {
          parent.remove();
        }
      } else {
        // Complex path, we have a deep node that isn't a child of the
        // target parent.
        // TODO: implement this functionality
      }
    }
  };

  return editor.registerNodeTransform(targetNode, elementNodeTransform);
}
