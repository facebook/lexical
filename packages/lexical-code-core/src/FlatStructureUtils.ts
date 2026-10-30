/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import invariant from '@lexical/internal/invariant';
import {
  $createLineBreakNode,
  $createTabNode,
  $getSiblingCaret,
  $getWritableNodeState,
  $isElementNode,
  $isLineBreakNode,
  $isTabNode,
  $isTextNode,
  type CaretDirection,
  getTextDirection,
  type LexicalNode,
  type LineBreakNode,
  NODE_STATE_KEY,
  type RangeSelection,
  type SiblingCaret,
  type TabNode,
  type TextNode,
  tokenizeRawText,
} from 'lexical';

import {
  $createCodeHighlightNode,
  $isCodeHighlightNode,
  type CodeHighlightNode,
} from './CodeHighlightNode';

// The anchor is generic (rather than the narrower
// `CodeHighlightNode | TabNode | LineBreakNode`) because callers may have only
// narrowed as far as TextNode; the matched siblings are always
// CodeHighlightNode/TabNode, and an unmatched anchor is returned unchanged.
function $getLastMatchingCodeNode<
  T extends TextNode | LineBreakNode,
  D extends CaretDirection,
>(anchor: T, direction: D): T | CodeHighlightNode | TabNode {
  let matchingNode: T | CodeHighlightNode | TabNode = anchor;
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

export function $getFirstCodeNodeOfLine<T extends TextNode | LineBreakNode>(
  anchor: T,
): T | CodeHighlightNode | TabNode {
  return $getLastMatchingCodeNode(anchor, 'previous');
}

export function $getLastCodeNodeOfLine<T extends TextNode | LineBreakNode>(
  anchor: T,
): T | CodeHighlightNode | TabNode {
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
      const prevSibling: LexicalNode | null = node.getPreviousSibling();
      if (prevSibling === null) {
        node = null;
        break;
      }
      invariant(
        $isCodeHighlightNode(prevSibling) ||
          $isTabNode(prevSibling) ||
          $isLineBreakNode(prevSibling),
        'Expected a valid Code Node: CodeHighlightNode, TabNode, LineBreakNode',
      );
      node = prevSibling;
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
 * Plain split of code text into CodeHighlightNodes (with no highlight
 * type) + LineBreakNodes + TabNodes. Used when the tokenizer opts out
 * of a default language so a previously highlighted block still
 * renders its `\n` / `\t` as real line breaks / tabs, while staying
 * compatible with the indent / shift-lines handlers that only accept
 * CodeHighlightNode + TabNode + LineBreakNode inside a CodeNode.
 */
export function $plainifyCodeContent(text: string): LexicalNode[] {
  const out: LexicalNode[] = [];
  tokenizeRawText(text, {
    linebreak: () => out.push($createLineBreakNode()),
    tab: () => out.push($createTabNode()),
    text: part => out.push($createCodeHighlightNode(part)),
  });
  return out;
}

/** The NodeState of `node` as JSON, or null where it has none. */
function nodeStateJSON(node: LexicalNode): null | Record<string, unknown> {
  // @internal access, like `__text`: the NodeState of the node
  const json = node.__state ? node.__state.toJSON() : null;
  return json !== null && Object.keys(json).length > 0
    ? (json as Record<string, unknown>)
    : null;
}

/**
 * Give `to` the NodeState `json` (see nodeStateJSON), flat states included,
 * keeping the state `to` has for the keys it does not set.
 */
function $setNodeStateJSON(
  to: LexicalNode,
  json: Record<string, unknown>,
): void {
  const state = $getWritableNodeState(to);
  for (const [key, value] of Object.entries(json)) {
    if (key === NODE_STATE_KEY) {
      for (const [nestedKey, nestedValue] of Object.entries(
        value as Record<string, unknown>,
      )) {
        state.updateFromUnknown(nestedKey, nestedValue);
      }
    } else {
      state.updateFromUnknown(key, value);
    }
  }
}

/**
 * Whether two nodes of a code block hold the same NodeState (see
 * {@link $keepNodeStateOf}).
 *
 * @internal
 */
export function sameNodeState(a: LexicalNode, b: LexicalNode): boolean {
  const ja = nodeStateJSON(a);
  const jb = nodeStateJSON(b);
  return ja === jb || JSON.stringify(ja) === JSON.stringify(jb);
}

/**
 * The nodes `next` that a highlighter made for the code `prev` holds (the
 * children of a code block, retokenized), with the NodeState each character
 * had in `prev`: a token whose text had more than one state is split where
 * the state changes. Highlighting changes how code is shown, never the state
 * its text carries (comment ids, suggestions or any other annotation an app
 * keeps in NodeState): without this, every token a highlighter replaced (all
 * tokens between the first and the last it changed) lost it. `prev` and
 * `next` hold the same text (a retokenization); `next` itself is returned
 * where no node of `prev` has NodeState, or, defensively, where their
 * lengths differ.
 *
 * @internal
 */
export function $keepNodeStateOf(
  prev: readonly LexicalNode[],
  next: LexicalNode[],
): LexicalNode[] {
  // The runs of `prev` that hold NodeState: [start, end) in the code.
  const runs: {end: number; json: Record<string, unknown>; start: number}[] =
    [];
  let length = 0;
  for (const node of prev) {
    const size = node.getTextContentSize();
    const json = nodeStateJSON(node);
    if (json !== null && size > 0) {
      runs.push({end: length + size, json, start: length});
    }
    length += size;
  }
  if (runs.length === 0) {
    return next;
  }
  let total = 0;
  for (const node of next) {
    total += node.getTextContentSize();
  }
  if (total !== length) {
    return next;
  }
  const out: LexicalNode[] = [];
  let offset = 0;
  let r = 0;
  for (const node of next) {
    const size = node.getTextContentSize();
    const start = offset;
    const end = offset + size;
    offset = end;
    while (r < runs.length && runs[r].end <= start) {
      r++;
    }
    if (size === 0 || r >= runs.length || runs[r].start >= end) {
      out.push(node);
      continue;
    }
    // Where the state changes within the node: cut points, and the state of
    // each piece (null where `prev` had none).
    const pieces: {end: number; json: null | Record<string, unknown>}[] = [];
    let at = start;
    for (let i = r; i < runs.length && runs[i].start < end; i++) {
      const run = runs[i];
      if (run.start > at) {
        pieces.push({end: run.start, json: null});
        at = run.start;
      }
      const stop = Math.min(run.end, end);
      const last = pieces[pieces.length - 1];
      if (
        last !== undefined &&
        last.json !== null &&
        JSON.stringify(last.json) === JSON.stringify(run.json)
      ) {
        last.end = stop;
      } else {
        pieces.push({end: stop, json: run.json});
      }
      at = stop;
    }
    if (at < end) {
      pieces.push({end, json: null});
    }
    if (pieces.length === 1 || !$isCodeHighlightNode(node)) {
      // One state over the whole node (a tab or a line break is one
      // character): it takes that state.
      const json = pieces.find(piece => piece.json !== null)!.json!;
      if ($isTextNode(node) || $isLineBreakNode(node)) {
        $setNodeStateJSON(node, json);
      }
      out.push(node);
      continue;
    }
    const text = node.getTextContent();
    let from = start;
    for (const piece of pieces) {
      const part = $createCodeHighlightNode(
        text.slice(from - start, piece.end - start),
        node.getHighlightType(),
      )
        .setFormat(node.getFormat())
        .setStyle(node.getStyle());
      if (piece.json !== null) {
        $setNodeStateJSON(part, piece.json);
      }
      out.push(part);
      from = piece.end;
    }
  }
  return out;
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
