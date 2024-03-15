/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {$isElementNode, $isTextNode, RootNode, TextNode} from 'lexical';

/**
 * Finds a TextNode with a size larger than targetCharacters and returns
 * the node along with the remaining length of the text.
 * @param root - The RootNode.
 * @param targetCharacters - The number of characters whose TextNode must be larger than.
 * @returns The TextNode and the intersections offset, or null if no TextNode is found.
 */
export function $findTextIntersectionFromCharacters(
  root: RootNode,
  targetCharacters: number,
): null | {node: TextNode; offset: number} {
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
