/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// The `$setBlockText` of the Block IDs documentation page
// (packages/lexical-website/docs/extensions/block-ids.md), as written there.
// Keep the two in sync (BlockIdDocs.test.ts checks it).

import {
  $createTextNode,
  $getSlotNames,
  $isElementNode,
  $isTextNode,
  type ElementNode,
  type LexicalNode,
} from 'lexical';

// Changes a block's text in place: only the characters that differ, in the
// block's own text nodes. block.replace(newBlock) would re-create the block,
// and what a collaborator types in it meanwhile would not stay where they
// typed it. Returns false, changing nothing, unless the block holds only text,
// directly or in inline elements such as links: no line breaks, nested blocks,
// named slots or decorators, even ones without text.
export function $setBlockText(block: LexicalNode, text: string): boolean {
  if (!$isElementNode(block) || !$holdsOnlyText(block)) {
    return false;
  }
  const nodes = block.getAllTextNodes();
  const old = nodes.map(node => node.getTextContent()).join('');
  let start = 0;
  while (start < old.length && old[start] === text[start]) {
    start++;
  }
  let end = 0;
  while (
    end < old.length - start &&
    end < text.length - start &&
    old[old.length - 1 - end] === text[text.length - 1 - end]
  ) {
    end++;
  }
  const inserted = text.slice(start, text.length - end);
  const deleteEnd = old.length - end;
  let offset = 0;
  let done = false;
  for (const node of nodes) {
    const size = node.getTextContentSize();
    const from = Math.max(start - offset, 0);
    const to = Math.min(deleteEnd - offset, size);
    if (
      !done &&
      (start - offset < size ||
        (start - offset === size && start === deleteEnd))
    ) {
      // The node where the change starts (for an insert at a node boundary,
      // the node before it): delete and insert there.
      node.spliceText(from, Math.max(to - from, 0), inserted);
      done = true;
    } else if (to > from) {
      node.spliceText(from, to - from, '');
    }
    offset += size;
  }
  if (!done && inserted !== '') {
    block.append($createTextNode(inserted));
  }
  return true;
}

function $holdsOnlyText(element: ElementNode): boolean {
  // Named slots hold blocks of their own (and count in getTextContent).
  return (
    $getSlotNames(element).length === 0 &&
    element
      .getChildren()
      .every(
        child =>
          $isTextNode(child) ||
          ($isElementNode(child) && child.isInline() && $holdsOnlyText(child)),
      )
  );
}
