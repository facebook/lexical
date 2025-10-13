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
  SiblingCaret,
  TabNode,
} from 'lexical';

import {$getAdjacentCaret} from '@lexical/utils';
import {
  $getSiblingCaret,
  $isElementNode,
  $isLineBreakNode,
  $isTabNode,
} from 'lexical';
import invariant from 'shared/invariant';

import {$isCodeHighlightNode} from './CodeHighlightNode';

const RTL_TEXT_RANGES = '\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC';
const LTR_TEXT_RANGES =
  'A-Za-z\u00C0-\u00D6\u00D8-\u00F6' +
  '\u00F8-\u02B8\u0300-\u0590\u0800-\u1FFF\u200E\u2C00-\uFB1C' +
  '\uFE00-\uFE6F\uFEFD-\uFFFF';

const RTL_TEXT_REGEX = new RegExp('[' + RTL_TEXT_RANGES + ']');
// eslint-disable-next-line no-misleading-character-class
const LTR_TEXT_REGEX = new RegExp('[' + LTR_TEXT_RANGES + ']');

function getDirectionFromText(text: string): 'ltr' | 'rtl' | null {
  for (let i = 0; i < text.length; i++) {
    const character = text[i];
    if (RTL_TEXT_REGEX.test(character)) {
      return 'rtl';
    }
    if (LTR_TEXT_REGEX.test(character)) {
      return 'ltr';
    }
  }
  return null;
}

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
    caret = $getAdjacentCaret(caret)
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
    let segment: string | null = null;
    if ($isCodeHighlightNode(node)) {
      segment = node.getTextContent();
    } else if ($isTabNode(node)) {
      segment = '\t';
    }

    if (segment !== null) {
      const direction = getDirectionFromText(segment);
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
  // eslint-disable-next-line no-constant-condition
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
  // eslint-disable-next-line no-constant-condition
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
