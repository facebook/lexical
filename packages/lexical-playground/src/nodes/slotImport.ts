/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {ElementNode, LexicalNode, ParagraphNode} from 'lexical';

import {$createParagraphNode, $isElementNode, $isLineBreakNode} from 'lexical';

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
  return $appendInline($createParagraphNode(), nodes);
}

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

export function $appendInline<T extends ElementNode>(
  line: T,
  nodes: Iterable<LexicalNode>,
): T {
  const children: LexicalNode[] = [];
  $flattenInlines(children, nodes);
  return line.splice(line.getChildrenSize(), 0, children);
}
