/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {ElementNode, RootNode, TextNode} from 'lexical';

import {$isElementNode, $isTextNode} from 'lexical';
import invariant from 'shared/invariant';

export type TextNodeWithOffset = {
  node: TextNode,
  offset: number,
};

export function $findTextIntersectionFromCharacters(
  root: RootNode,
  targetCharacters: number,
): null | {node: TextNode, offset: number} {
  let node = root.getFirstChild();
  let currentCharacters = 0;

  mainLoop: while (node !== null) {
    if ($isElementNode(node)) {
      const child = node.getFirstChild();
      if (child !== null) {
        node = child;
        continue;
      }
    } else if ($isTextNode(node)) {
      const characters = node.getTextContentSize();

      if (currentCharacters + characters > targetCharacters) {
        return {node, offset: targetCharacters - currentCharacters};
      }
      currentCharacters += characters;
    }
    const sibling = node.getNextSibling();
    if (sibling !== null) {
      node = sibling;
      continue;
    }
    let parent = node.getParent();
    while (parent !== null) {
      const parentSibling = parent.getNextSibling();
      if (parentSibling !== null) {
        node = parentSibling;
        continue mainLoop;
      }
      parent = parent.getParent();
    }
    break;
  }
  return null;
}

// Return text content for child text nodes.  Each non-text node is separated by input string.
// Caution, this function creates a string and should not be used within a tight loop.
// Use $getNodeWithOffsetsFromJoinedTextNodesFromElementNode below to convert
// indexes in the return string back into their corresponding node and offsets.
export function $joinTextNodesInElementNode(
  elementNode: ElementNode,
  separator: string,
  stopAt: TextNodeWithOffset,
): string {
  let textContent = '';
  const children = elementNode.getChildren();
  const length = children.length;
  for (let i = 0; i < length; ++i) {
    const child = children[i];
    if ($isTextNode(child)) {
      const childTextContent = child.getTextContent();

      if (child.is(stopAt.node)) {
        if (stopAt.offset > childTextContent.length) {
          invariant(
            false,
            'Node %s and selection point do not match.',
            child.__key,
          );
        }
        textContent += child.getTextContent().substr(0, stopAt.offset);
        break;
      } else {
        textContent += childTextContent;
      }
    } else {
      textContent += separator;
    }
  }
  return textContent;
}

// This function converts the offsetInJoinedText to
// a node and offset result or null if not found.
// This function is to be used in conjunction with joinTextNodesInElementNode above.
// The joinedTextContent should be return value from joinTextNodesInElementNode.
//
// The offsetInJoinedText is relative to the entire string which
// itself is relevant to the parent ElementNode.
//
// Example:
// Given a Paragraph with 2 TextNodes. The first is Hello, the second is World.
// The joinedTextContent would be "HelloWorld"
// The offsetInJoinedText might be for the letter "e" = 1 or "r" = 7.
// The return values would be {TextNode1, 1} or {TextNode2,2}, respectively.

export function $findNodeWithOffsetFromJoinedText(
  elementNode: ElementNode,
  joinedTextLength: number,
  offsetInJoinedText: number,
  separatorLength: number,
): ?TextNodeWithOffset {
  const children = elementNode.getChildren();
  const childrenLength = children.length;
  let runningLength = 0;
  for (let i = 0; i < childrenLength; ++i) {
    if (runningLength >= joinedTextLength) {
      break;
    }

    const child = children[i];
    const childContentLength = $isTextNode(child)
      ? child.getTextContent().length
      : separatorLength;

    const newRunningLength = runningLength + childContentLength;
    if (
      runningLength <= offsetInJoinedText &&
      offsetInJoinedText < newRunningLength &&
      $isTextNode(child)
    ) {
      return {
        node: child,
        offset: offsetInJoinedText - runningLength,
      };
    }
    runningLength = newRunningLength;
  }
  return null;
}
