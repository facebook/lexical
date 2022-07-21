/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$isCodeHighlightNode, CodeHighlightNode} from '@lexical/code';
import {$isLineBreakNode, LexicalNode} from 'lexical';

export function getFirstCodeHighlightNodeOfLine(
  anchor: LexicalNode,
): CodeHighlightNode | null | undefined {
  let currentNode = null;
  const previousSiblings = anchor.getPreviousSiblings();
  previousSiblings.push(anchor);
  while (previousSiblings.length > 0) {
    const node = previousSiblings.pop();
    if ($isCodeHighlightNode(node)) {
      currentNode = node;
    }
    if ($isLineBreakNode(node)) {
      break;
    }
  }

  return currentNode;
}

export function getLastCodeHighlightNodeOfLine(
  anchor: LexicalNode,
): CodeHighlightNode | null | undefined {
  let currentNode = null;
  const nextSiblings = anchor.getNextSiblings();
  nextSiblings.unshift(anchor);
  while (nextSiblings.length > 0) {
    const node = nextSiblings.shift();
    if ($isCodeHighlightNode(node)) {
      currentNode = node;
    }
    if ($isLineBreakNode(node)) {
      break;
    }
  }

  return currentNode;
}
