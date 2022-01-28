/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {ElementNode, RootNode, TextNode} from 'lexical';
import invariant from 'shared/invariant';
import {$isTextNode, $isElementNode} from 'lexical';

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
export function $joinTextNodesFromElementNode(
  elementNode: ElementNode,
  separator: string,
  stopAtNode: TextNode,
  stopAtNodeOffset: number,
): string {
  let textContent = '';
  const children = elementNode.getChildren();
  const length = children.length;
  for (let i = 0; i < length; ++i) {
    const child = children[i];
    if ($isTextNode(child)) {
      const childTextContent = child.getTextContent();

      if (child.is(stopAtNode)) {
        if (stopAtNodeOffset > childTextContent.length) {
          invariant(
            false,
            'Node %s and selection point do not match.',
            child.__key,
          );
        }
        textContent += child.getTextContent().substr(0, stopAtNodeOffset);
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
