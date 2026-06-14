/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalNode, ParagraphNode} from 'lexical';

import {
  $createParagraphNode,
  $isDecoratorNode,
  $isElementNode,
  $isLineBreakNode,
} from 'lexical';

/**
 * Build a single-line slot value from imported content: a bare paragraph whose
 * children are the inline projection of `nodes`. Mirrors core's `<input>`
 * analogy for block slot values (the flattening `RangeSelection.insertNodes`
 * applies when pasting into one): recurse into non-inline elements for their
 * inline children, strip line breaks, and drop block-only decorators — they
 * have no single-line form.
 *
 * Shared by the single-line slot host import rules (Card's `title`, PullQuote's
 * `attribution`, Review's `author`), each of which lives with its own
 * extension.
 */
export function $createLineSlotValue(nodes: LexicalNode[]): ParagraphNode {
  const line = $createParagraphNode();
  const appendInline = (children: LexicalNode[]): void => {
    for (const node of children) {
      if ($isLineBreakNode(node)) {
        continue;
      }
      if (
        ($isElementNode(node) || $isDecoratorNode(node)) &&
        !node.isInline()
      ) {
        if ($isElementNode(node)) {
          appendInline(node.getChildren());
        }
        continue;
      }
      line.append(node);
    }
  };
  appendInline(nodes);
  return line;
}
