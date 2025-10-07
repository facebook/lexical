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
  ElementNode,
  type LexicalNode,
} from 'lexical';

export function $wrapContinuousInlines(
  domNode: Node,
  nodes: Array<LexicalNode>,
  $createWrapperFn: () => ElementNode,
): Array<LexicalNode> {
  const textAlign = (domNode as HTMLElement).style
    .textAlign as ElementFormatType;
  const out: Array<LexicalNode> = [];
  let continuousInlines: Array<LexicalNode> = [];
  // wrap contiguous inline child nodes in para
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if ($isBlockElementNode(node)) {
      if (textAlign && !node.getFormat()) {
        node.setFormat(textAlign);
      }
      out.push(node);
    } else {
      continuousInlines.push(node);
      if (
        i === nodes.length - 1 ||
        (i < nodes.length - 1 && $isBlockElementNode(nodes[i + 1]))
      ) {
        const wrapper = $createWrapperFn();
        wrapper.setFormat(textAlign);
        wrapper.append(...continuousInlines);
        out.push(wrapper);
        continuousInlines = [];
      }
    }
  }
  return out;
}
