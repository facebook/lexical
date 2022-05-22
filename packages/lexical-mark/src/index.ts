/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalNode, RangeSelection, TextNode} from 'lexical';

import {$isElementNode, $isTextNode} from 'lexical';

import {$createMarkNode, $isMarkNode, MarkNode} from './MarkNode';

export function $unwrapMarkNode(node: MarkNode): void {
  const children = node.getChildren();
  let target = null;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (target === null) {
      node.insertBefore(child);
    } else {
      target.insertAfter(child);
    }
    target = child;
  }
  node.remove();
}

export function $wrapSelectionInMarkNode(
  selection: RangeSelection,
  isBackward: boolean,
  id: string,
): void {
  const nodes = selection.getNodes();
  const anchorOffset = selection.anchor.offset;
  const focusOffset = selection.focus.offset;
  const nodesLength = nodes.length;
  const startOffset = isBackward ? focusOffset : anchorOffset;
  const endOffset = isBackward ? anchorOffset : focusOffset;
  let currentNodeParent;
  let currentMarkNode;

  // We only want wrap adjacent text nodes, line break nodes
  // and inline element nodes. For decorator nodes and block
  // element nodes, we stop out their boundary and start again
  // after, if there are more nodes.
  for (let i = 0; i < nodesLength; i++) {
    const node = nodes[i];
    if ($isElementNode(currentMarkNode) && currentMarkNode.isParentOf(node)) {
      continue;
    }
    const isFirstNode = i === 0;
    const isLastNode = i === nodesLength - 1;
    let targetNode: LexicalNode;

    if ($isTextNode(node)) {
      const textContentSize = node.getTextContentSize();
      const startTextOffset = isFirstNode ? startOffset : 0;
      const endTextOffset = isLastNode ? endOffset : textContentSize;
      if (startTextOffset === 0 && endTextOffset === 0) {
        continue;
      }
      const splitNodes = node.splitText(startTextOffset, endTextOffset);
      targetNode =
        splitNodes.length > 1 &&
        (splitNodes.length === 3 ||
          (isFirstNode && !isLastNode) ||
          endTextOffset === textContentSize)
          ? splitNodes[1]
          : splitNodes[0];
    } else if ($isElementNode(node) && node.isInline()) {
      targetNode = node;
    }
    if (targetNode !== undefined) {
      if (targetNode && targetNode.is(currentNodeParent)) {
        continue;
      }
      const parentNode = targetNode.getParent();
      if (parentNode == null || !parentNode.is(currentNodeParent)) {
        currentMarkNode = undefined;
      }
      currentNodeParent = parentNode;
      if (currentMarkNode === undefined) {
        currentMarkNode = $createMarkNode([id]);
        targetNode.insertBefore(currentMarkNode);
      }
      currentMarkNode.append(targetNode);
    } else {
      currentNodeParent = undefined;
      currentMarkNode = undefined;
    }
  }
}

export function $getMarkIDs(
  node: TextNode,
  offset: number,
): null | Array<string> {
  let currentNode: LexicalNode = node;
  while (currentNode !== null) {
    if ($isMarkNode(currentNode)) {
      return currentNode.getIDs();
    } else if (
      $isTextNode(currentNode) &&
      offset === currentNode.getTextContentSize()
    ) {
      const nextSibling = currentNode.getNextSibling();
      if ($isMarkNode(nextSibling)) {
        return nextSibling.getIDs();
      }
    }
    currentNode = currentNode.getParent();
  }
  return null;
}

export {$createMarkNode, $isMarkNode, MarkNode};
