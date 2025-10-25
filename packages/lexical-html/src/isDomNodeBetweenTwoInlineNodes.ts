/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {isInlineDomNode} from 'lexical';

export function isDomNodeBetweenTwoInlineNodes(node: Node): boolean {
  if (node.nextSibling == null || node.previousSibling == null) {
    return false;
  }
  return (
    isInlineDomNode(node.nextSibling) && isInlineDomNode(node.previousSibling)
  );
}
