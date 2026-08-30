/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $isElementNode,
  $isLineBreakNode,
  type ElementNode,
  type LexicalNode,
} from 'lexical';

function $flattenInlines(
  output: LexicalNode[],
  input: Iterable<LexicalNode>,
): void {
  for (const node of input) {
    if ($isLineBreakNode(node)) {
      // ignore
    } else if (node.isInline()) {
      output.push(node);
    } else if ($isElementNode(node)) {
      $flattenInlines(output, node.getChildren());
    }
  }
}

/**
 * Append the inline projection of `nodes` to `line`, in a single splice.
 * Mirrors core's `<input>` analogy for single-line slot values (the flattening
 * `RangeSelection.insertNodes` applies when pasting into one): recurse into
 * non-inline elements for their inline children, strip line breaks, and drop
 * block-only decorators — they have no single-line form.
 *
 * Used by the single-line slot host import rules (Card's `title`, PullQuote's
 * `attribution`, Review's `author`), each of which lives with its own
 * extension.
 */
export function $appendInline<T extends ElementNode>(
  line: T,
  nodes: Iterable<LexicalNode>,
): T {
  const children: LexicalNode[] = [];
  $flattenInlines(children, nodes);
  return line.splice(line.getChildrenSize(), 0, children);
}
