/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {RootNode, TextNode} from 'outline';

import {isTextNode, isBlockNode} from 'outline';

let _graphemeIterator = null;
// $FlowFixMe: Missing a Flow type for `Intl.Segmenter`.
export function getGraphemeIterator(): Intl.Segmenter {
  if (_graphemeIterator === null) {
    _graphemeIterator =
      // $FlowFixMe: Missing a Flow type for `Intl.Segmenter`.
      new Intl.Segmenter(undefined /* locale */, {granularity: 'grapheme'});
  }
  return _graphemeIterator;
}

export function findTextIntersectionFromCharacters(
  root: RootNode,
  targetCharacters: number,
): null | {node: TextNode, offset: number} {
  let node = root.getFirstChild();
  let currentCharacters = 0;

  mainLoop: while (node !== null) {
    if (isBlockNode(node)) {
      const child = node.getFirstChild();
      if (child !== null) {
        node = child;
        continue;
      }
    } else if (isTextNode(node)) {
      const characters = node.getTextContent().length;

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
