/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {CodeHighlightNode} from './CodeHighlightNode';
import type {
  CaretDirection,
  LexicalNode,
  LineBreakNode,
  RangeSelection,
  SiblingCaret,
  TabNode,
} from 'lexical';

import {
  $getSiblingCaret,
  $isElementNode,
  $isLineBreakNode,
  $isTabNode,
  getTextDirection,
} from 'lexical';
import invariant from 'shared/invariant';

import {$isCodeHighlightNode} from './CodeHighlightNode';

function $getLastMatchingCodeNode<D extends CaretDirection>(
  anchor: CodeHighlightNode | TabNode | LineBreakNode,
  direction: D,
): CodeHighlightNode | TabNode | LineBreakNode {
  let matchingNode: CodeHighlightNode | TabNode | LineBreakNode = anchor;
  for (
    let caret: null | SiblingCaret<LexicalNode, D> = $getSiblingCaret(
      anchor,
      direction,
    );
    caret && ($isCodeHighlightNode(caret.origin) || $isTabNode(caret.origin));
    caret = caret.getAdjacentCaret()
  ) {
    matchingNode = caret.origin;
  }
  return matchingNode;
}

export function $getFirstCodeNodeOfLine(
  anchor: CodeHighlightNode | TabNode | LineBreakNode,
): CodeHighlightNode | TabNode | LineBreakNode {
  return $getLastMatchingCodeNode(anchor, 'previous');
}

export function $getLastCodeNodeOfLine(
  anchor: CodeHighlightNode | TabNode | LineBreakNode,
): CodeHighlightNode | TabNode | LineBreakNode {
  return $getLastMatchingCodeNode(anchor, 'next');
}

/**
 * Determines the visual writing direction of a code line.
 *
 * Scans the line segments (CodeHighlightNode/TabNode) from start to end
 * and returns the first strong direction found ("ltr" or "rtl").
 * If no strong character is found, falls back to the parent element's
 * direction. Returns null if indeterminate.
 */
export function $getCodeLineDirection(
  anchor: CodeHighlightNode | TabNode | LineBreakNode,
): 'ltr' | 'rtl' | null {
  const start = $getFirstCodeNodeOfLine(anchor);
  const end = $getLastCodeNodeOfLine(anchor);
  let node: null | LexicalNode = start;

  while (node !== null) {
    if ($isCodeHighlightNode(node)) {
      const direction = getTextDirection(node.getTextContent());
      if (direction !== null) {
        return direction;
      }
    }

    if (node === end) {
      break;
    }

    node = node.getNextSibling();
  }

  const parent = start.getParent();
  if ($isElementNode(parent)) {
    const parentDirection = parent.getDirection();
    if (parentDirection === 'ltr' || parentDirection === 'rtl') {
      return parentDirection;
    }
  }

  return null;
}

export function $getStartOfCodeInLine(
  anchor: CodeHighlightNode | TabNode,
  offset: number,
): null | {
  node: CodeHighlightNode | TabNode | LineBreakNode;
  offset: number;
} {
  let last: null | {
    node: CodeHighlightNode | TabNode | LineBreakNode;
    offset: number;
  } = null;
  let lastNonBlank: null | {node: CodeHighlightNode; offset: number} = null;
  let node: null | CodeHighlightNode | TabNode | LineBreakNode = anchor;
  let nodeOffset = offset;
  let nodeTextContent = anchor.getTextContent();

  while (true) {
    if (nodeOffset === 0) {
      node = node.getPreviousSibling();
      if (node === null) {
        break;
      }
      invariant(
        $isCodeHighlightNode(node) ||
          $isTabNode(node) ||
          $isLineBreakNode(node),
        'Expected a valid Code Node: CodeHighlightNode, TabNode, LineBreakNode',
      );
      if ($isLineBreakNode(node)) {
        last = {
          node,
          offset: 1,
        };
        break;
      }
      nodeOffset = Math.max(0, node.getTextContentSize() - 1);
      nodeTextContent = node.getTextContent();
    } else {
      nodeOffset--;
    }
    const character = nodeTextContent[nodeOffset];
    if ($isCodeHighlightNode(node) && character !== ' ') {
      lastNonBlank = {
        node,
        offset: nodeOffset,
      };
    }
  }
  // lastNonBlank !== null: anchor in the middle of code; move to line beginning
  if (lastNonBlank !== null) {
    return lastNonBlank;
  }
  // Spaces, tabs or nothing ahead of anchor
  let codeCharacterAtAnchorOffset = null;
  if (offset < anchor.getTextContentSize()) {
    if ($isCodeHighlightNode(anchor)) {
      codeCharacterAtAnchorOffset = anchor.getTextContent()[offset];
    }
  } else {
    const nextSibling = anchor.getNextSibling();
    if ($isCodeHighlightNode(nextSibling)) {
      codeCharacterAtAnchorOffset = nextSibling.getTextContent()[0];
    }
  }
  if (
    codeCharacterAtAnchorOffset !== null &&
    codeCharacterAtAnchorOffset !== ' '
  ) {
    // Borderline whitespace and code, move to line beginning
    return last;
  } else {
    const nextNonBlank = findNextNonBlankInLine(anchor, offset);
    if (nextNonBlank !== null) {
      return nextNonBlank;
    } else {
      return last;
    }
  }
}

function findNextNonBlankInLine(
  anchor: LexicalNode,
  offset: number,
): null | {node: CodeHighlightNode; offset: number} {
  let node: null | LexicalNode = anchor;
  let nodeOffset = offset;
  let nodeTextContent = anchor.getTextContent();
  let nodeTextContentSize = anchor.getTextContentSize();

  while (true) {
    if (!$isCodeHighlightNode(node) || nodeOffset === nodeTextContentSize) {
      node = node.getNextSibling();
      if (node === null || $isLineBreakNode(node)) {
        return null;
      }
      if ($isCodeHighlightNode(node)) {
        nodeOffset = 0;
        nodeTextContent = node.getTextContent();
        nodeTextContentSize = node.getTextContentSize();
      }
    }
    if ($isCodeHighlightNode(node)) {
      if (nodeTextContent[nodeOffset] !== ' ') {
        return {
          node,
          offset: nodeOffset,
        };
      }
      nodeOffset++;
    }
  }
}

export function $getEndOfCodeInLine(
  anchor: CodeHighlightNode | TabNode,
): CodeHighlightNode | TabNode {
  const lastNode = $getLastCodeNodeOfLine(anchor);
  invariant(
    !$isLineBreakNode(lastNode),
    'Unexpected lineBreakNode in getEndOfCodeInLine',
  );
  return lastNode;
}

/**
 * Strip up to `tabSize` leading spaces from a {@link CodeHighlightNode} that
 * starts a code line, to support outdenting space-indented code lines (e.g.
 * code formatted with prettier). Returns true if any spaces were stripped.
 *
 * Best-effort: a line with fewer than `tabSize` leading spaces has all of
 * them stripped, matching VS Code / IntelliJ behavior.
 *
 * Selection is preserved relative to line content. Anchor/focus offsets
 * pointing into `node` shift left by the number of stripped characters
 * (clamped to 0). The underlying TextNode mutation does not adjust
 * selection offsets that already point into the old text, so we patch
 * them up explicitly.
 */
export function $outdentLeadingSpaces(
  node: CodeHighlightNode,
  tabSize: number,
  selection: RangeSelection,
): boolean {
  if (!Number.isInteger(tabSize) || tabSize <= 0) {
    return false;
  }
  const text = node.getTextContent();
  const leading = /^ +/.exec(text);
  if (!leading) {
    return false;
  }
  const stripCount = Math.min(tabSize, leading[0].length);
  const lineKey = node.getKey();
  const oldAnchorOffset =
    selection.anchor.key === lineKey && selection.anchor.type === 'text'
      ? selection.anchor.offset
      : null;
  const oldFocusOffset =
    selection.focus.key === lineKey && selection.focus.type === 'text'
      ? selection.focus.offset
      : null;
  node.spliceText(0, stripCount, '');
  if (oldAnchorOffset !== null) {
    selection.anchor.set(
      lineKey,
      Math.max(0, oldAnchorOffset - stripCount),
      'text',
    );
  }
  if (oldFocusOffset !== null) {
    selection.focus.set(
      lineKey,
      Math.max(0, oldFocusOffset - stripCount),
      'text',
    );
  }
  return true;
}
