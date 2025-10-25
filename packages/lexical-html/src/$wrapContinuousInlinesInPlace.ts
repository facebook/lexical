/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {
  $isBlockElementNode,
  type ElementFormatType,
  type ElementNode,
  type LexicalNode,
} from 'lexical';

export function $wrapContinuousInlinesInPlace(
  domNode: Node,
  nodes: LexicalNode[],
  $createWrapperFn: () => ElementNode,
): void {
  const textAlign = (domNode as HTMLElement).style
    .textAlign as ElementFormatType;
  // wrap contiguous inline child nodes in para
  let j = 0;
  for (let i = 0, wrapper: undefined | ElementNode; i < nodes.length; i++) {
    const node = nodes[i];
    if ($isBlockElementNode(node)) {
      if (textAlign && !node.getFormat()) {
        node.setFormat(textAlign);
      }
      wrapper = undefined;
      nodes[j++] = node;
    } else {
      if (!wrapper) {
        nodes[j++] = wrapper = $createWrapperFn().setFormat(textAlign);
      }
      wrapper.append(node);
    }
  }
  nodes.length = j;
}
