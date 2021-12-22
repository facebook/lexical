/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalNode, Point} from 'lexical';

export default function getPossibleDecoratorNode(
  focus: Point,
  isBackward: boolean,
): null | LexicalNode {
  const focusOffset = focus.offset;
  if (focus.type === 'element') {
    const block = focus.getNode();
    return block.getChildAtIndex(isBackward ? focusOffset - 1 : focusOffset);
  } else {
    const focusNode = focus.getNode();
    if (
      (isBackward && focusOffset === 0) ||
      (!isBackward && focusOffset === focusNode.getTextContentSize())
    ) {
      return isBackward
        ? focusNode.getPreviousSibling()
        : focusNode.getNextSibling();
    }
  }
  return null;
}
