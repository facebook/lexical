/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {LexicalNode, NodeKey} from '../LexicalNode';
import type {
  BreadthNodeCaret,
  CaretDirection,
  NodeCaret,
  NodeCaretRange,
  RangeNodeCaret,
  RootMode,
  TextNodeCaret,
  TextNodeCaretSlice,
} from './LexicalCaret';

import invariant from 'shared/invariant';

import {
  $createRangeSelection,
  $getSelection,
  $isRangeSelection,
  type PointType,
  type RangeSelection,
} from '../LexicalSelection';
import {
  $getAncestor,
  $getNodeByKeyOrThrow,
  $setSelection,
  INTERNAL_$isBlock,
} from '../LexicalUtils';
import {$isElementNode, type ElementNode} from '../nodes/LexicalElementNode';
import {
  $createTextNode,
  $isTextNode,
  type TextNode,
} from '../nodes/LexicalTextNode';
import {
  $getBreadthCaret,
  $getCaretRange,
  $getChildCaretOrSelf,
  $getDepthCaret,
  $getTextNodeCaret,
  $isBreadthNodeCaret,
  $isDepthNodeCaret,
  $isTextNodeCaret,
  flipDirection,
} from './LexicalCaret';

/**
 * @param point
 * @returns a RangeNodeCaret for the point
 */
export function $caretFromPoint<D extends CaretDirection>(
  point: PointType,
  direction: D,
): RangeNodeCaret<D> {
  const {type, key, offset} = point;
  const node = $getNodeByKeyOrThrow(point.key);
  if (type === 'text') {
    invariant(
      $isTextNode(node),
      '$caretFromPoint: Node with type %s and key %s that does not inherit from TextNode encountered for text point',
      node.getType(),
      key,
    );
    return $getTextNodeCaret(node, direction, offset);
  }
  invariant(
    $isElementNode(node),
    '$caretFromPoint: Node with type %s and key %s that does not inherit from ElementNode encountered for element point',
    node.getType(),
    key,
  );
  return $getChildCaretAtIndex(node, point.offset, direction);
}

/**
 * Update the given point in-place from the RangeNodeCaret
 *
 * @param point the point to set
 * @param caret the caret to set the point from
 */
export function $setPointFromCaret<D extends CaretDirection>(
  point: PointType,
  caret: RangeNodeCaret<D>,
): void {
  if ($isTextNodeCaret(caret)) {
    point.set(caret.origin.getKey(), caret.offset, 'text');
  } else {
    const {origin, direction} = caret;
    const isNext = direction === 'next';
    if ($isDepthNodeCaret(caret)) {
      point.set(
        origin.getKey(),
        isNext ? 0 : caret.origin.getChildrenSize(),
        'element',
      );
    } else if ($isTextNode(origin)) {
      point.set(
        origin.getKey(),
        isNext ? origin.getTextContentSize() : 0,
        'text',
      );
    } else {
      point.set(
        origin.getParentOrThrow().getKey(),
        origin.getIndexWithinParent() + (isNext ? 1 : 0),
        'element',
      );
    }
  }
}

/**
 * Set a RangeSelection on the editor from the given NodeCaretRange
 *
 * @returns The new RangeSelection
 */
export function $setSelectionFromCaretRange(
  caretRange: NodeCaretRange,
): RangeSelection {
  const currentSelection = $getSelection();
  const selection = $isRangeSelection(currentSelection)
    ? currentSelection
    : $createRangeSelection();
  $updateRangeSelectionFromCaretRange(selection, caretRange);
  $setSelection(selection);
  return selection;
}

/**
 * Update the points of a RangeSelection based on the given RangeNodeCaret.
 */
export function $updateRangeSelectionFromCaretRange(
  selection: RangeSelection,
  caretRange: NodeCaretRange,
): void {
  $setPointFromCaret(selection.anchor, caretRange.anchor);
  $setPointFromCaret(selection.focus, caretRange.focus);
}

/**
 * Get a pair of carets for a RangeSelection.
 *
 * If the focus is before the anchor, then the direction will be
 * 'previous', otherwise the direction will be 'next'.
 */
export function $caretRangeFromSelection(
  selection: RangeSelection,
): NodeCaretRange {
  const {anchor, focus} = selection;
  const direction = focus.isBefore(anchor) ? 'previous' : 'next';
  return $getCaretRange(
    $caretFromPoint(anchor, direction),
    $caretFromPoint(focus, direction),
  );
}

/**
 * Given a BreadthNodeCaret we can always compute a caret that points to the
 * origin of that caret in the same direction. The adjacent caret of the
 * returned caret will be equivalent to the given caret.
 *
 * @example
 * ```ts
 * breadthCaret.is($rewindBreadthCaret(breadthCaret).getAdjacentCaret())
 * ```
 *
 * @param caret The caret to "rewind"
 * @returns A new caret (DepthNodeCaret or BreadthNodeCaret) with the same direction
 */
export function $rewindBreadthCaret<
  T extends LexicalNode,
  D extends CaretDirection,
>(caret: BreadthNodeCaret<T, D>): NodeCaret<D> {
  const {direction, origin} = caret;
  // Rotate the direction around the origin and get the adjacent node
  const rewindOrigin = $getBreadthCaret(
    origin,
    flipDirection(direction),
  ).getNodeAtCaret();
  return rewindOrigin
    ? $getBreadthCaret(rewindOrigin, direction)
    : $getDepthCaret(origin.getParentOrThrow(), direction);
}

function $getAnchorCandidates<D extends CaretDirection>(
  anchor: NodeCaret<D>,
  rootMode: RootMode = 'root',
): [NodeCaret<D>, ...NodeCaret<D>[]] {
  const carets: [NodeCaret<D>, ...NodeCaret<D>[]] = [anchor];
  for (
    let parent = anchor.getParentCaret(rootMode);
    parent !== null;
    parent = parent.getParentCaret(rootMode)
  ) {
    carets.push($rewindBreadthCaret(parent));
  }
  return carets;
}

/**
 * Remove all text and nodes in the given range. The block containing the
 * focus will be removed and merged with the anchor's block if they are
 * not the same.
 *
 * @param range The range to remove text and nodes from
 * @returns The new collapsed range
 */
export function $removeTextFromCaretRange<D extends CaretDirection>(
  range: NodeCaretRange<D>,
): NodeCaretRange<D> {
  if (range.isCollapsed()) {
    return range;
  }
  let anchorCandidates = $getAnchorCandidates(range.anchor);
  const {direction} = range;

  // Remove all internal nodes
  const canRemove = new Set<NodeKey>();
  for (const caret of range.internalCarets('root')) {
    if ($isDepthNodeCaret(caret)) {
      canRemove.add(caret.origin.getKey());
    } else if ($isBreadthNodeCaret(caret)) {
      const {origin} = caret;
      if (!$isElementNode(origin) || canRemove.has(origin.getKey())) {
        origin.remove();
      }
    }
  }
  // Merge blocks if necessary
  const firstBlock = $getAncestor(range.anchor.origin, INTERNAL_$isBlock);
  const lastBlock = $getAncestor(range.focus.origin, INTERNAL_$isBlock);
  if (
    $isElementNode(lastBlock) &&
    canRemove.has(lastBlock.getKey()) &&
    $isElementNode(firstBlock)
  ) {
    $getDepthCaret(firstBlock, flipDirection(direction)).splice(
      0,
      lastBlock.getChildren(),
    );
    lastBlock.remove();
  }
  // Splice text at the anchor and/or origin.
  // If the text is entirely selected then it is removed.
  // If it's a token with a non-empty selection then it is removed.
  // Segmented nodes will be copied to a plain text node with the same format
  // and style and set to normal mode.
  for (const slice of range.getNonEmptyTextSlices()) {
    const {origin} = slice.caret;
    const isAnchor = anchorCandidates[0].is(slice.caret);
    const contentSize = origin.getTextContentSize();
    const caretBefore = $rewindBreadthCaret(
      $getBreadthCaret(origin, direction),
    );
    const mode = origin.getMode();
    if (
      Math.abs(slice.size) === contentSize ||
      (mode === 'token' && slice.size !== 0)
    ) {
      if (isAnchor) {
        anchorCandidates = $getAnchorCandidates(caretBefore);
      }
      caretBefore.remove();
    } else {
      const nextCaret = $removeTextSlice(slice);
      if (isAnchor) {
        anchorCandidates = $getAnchorCandidates(nextCaret);
      }
      if (mode === 'segmented') {
        const src = nextCaret.origin;
        const plainTextNode = $createTextNode(src.getTextContent())
          .setStyle(src.getStyle())
          .setFormat(src.getFormat());
        caretBefore.replaceOrInsert(plainTextNode);
        if (isAnchor) {
          anchorCandidates = $getAnchorCandidates(
            $getTextNodeCaret(
              plainTextNode,
              nextCaret.direction,
              nextCaret.offset,
            ),
          );
        }
      }
    }
  }
  for (const caret of anchorCandidates) {
    if (caret.origin.isAttached()) {
      const anchor = $normalizeCaret(caret);
      return $getCaretRange(anchor, anchor);
    }
  }
  invariant(
    false,
    '$removeTextFromCaretRange: selection was lost, could not find a new anchor given candidates with keys: %s',
    JSON.stringify(anchorCandidates.map((n) => n.origin.__key)),
  );
}

/**
 * Return the deepest DepthNodeCaret that has initialCaret's origin
 * as an ancestor, or initialCaret if the origin is not an ElementNode
 * or is already the deepest DepthNodeCaret.
 *
 * This is generally used when normalizing because there is
 * "zero distance" between these locations.
 *
 * @param initialCaret
 * @returns Either a deeper DepthNodeCaret or the given initialCaret
 */
function $getDeepestChildOrSelf<Caret extends RangeNodeCaret | null>(
  initialCaret: Caret,
): RangeNodeCaret<NonNullable<Caret>['direction']> | (Caret & null) {
  let caret = $getChildCaretOrSelf(initialCaret);
  while ($isDepthNodeCaret(caret)) {
    const childNode = caret.getNodeAtCaret();
    if (!$isElementNode(childNode)) {
      break;
    }
    caret = $getDepthCaret(childNode, caret.direction);
  }
  return (caret && caret.getChildCaret()) || caret;
}

/**
 * Normalize a caret to the deepest equivalent RangeNodeCaret.
 * This will return a TextNodeCaret with the offset set according
 * to the direction if given a caret with a TextNode origin
 * or a caret with an ElementNode origin with the deepest DepthNode
 * having an adjacent TextNode.
 *
 * If given a TextNodeCaret, it will be returned, as no normalization
 * is required when an offset is already present.
 *
 * @param initialCaret
 * @returns The normalized RangeNodeCaret
 */
export function $normalizeCaret<D extends CaretDirection>(
  initialCaret: RangeNodeCaret<D>,
): RangeNodeCaret<D> {
  const caret = initialCaret.getLatest();
  const {direction} = caret;
  if ($isTextNodeCaret(caret)) {
    return caret;
  }
  if ($isTextNode(caret.origin)) {
    return $getTextNodeCaret(caret.origin, direction, direction);
  }
  const adjacent = $getDeepestChildOrSelf(caret.getAdjacentCaret());
  return $isBreadthNodeCaret(adjacent) && $isTextNode(adjacent.origin)
    ? $getTextNodeCaret(adjacent.origin, direction, flipDirection(direction))
    : caret;
}

function $getTextSliceIndices<T extends TextNode, D extends CaretDirection>(
  slice: TextNodeCaretSlice<T, D>,
): [indexStart: number, indexEnd: number] {
  const {
    size,
    caret: {offset},
  } = slice;
  return [offset, offset + size].sort((a, b) => a - b) as [number, number];
}

export function $removeTextSlice<T extends TextNode, D extends CaretDirection>(
  slice: TextNodeCaretSlice<T, D>,
): TextNodeCaret<T, D> {
  const {
    caret: {origin, direction},
  } = slice;
  const [indexStart, indexEnd] = $getTextSliceIndices(slice);
  const text = origin.getTextContent();
  return $getTextNodeCaret(
    origin.setTextContent(text.slice(0, indexStart) + text.slice(indexEnd)),
    direction,
    indexStart,
  );
}

export function $getTextSliceContent<
  T extends TextNode,
  D extends CaretDirection,
>(slice: TextNodeCaretSlice<T, D>): string {
  return slice.caret.origin
    .getTextContent()
    .slice(...$getTextSliceIndices(slice));
}

/**
 * Get a 'next' caret for the child at the given index, or the last
 * caret in that node if out of bounds
 *
 * @param parent An ElementNode
 * @param index The index of the origin for the caret
 * @returns A next caret with the arrow at that index
 */
export function $getChildCaretAtIndex<D extends CaretDirection>(
  parent: ElementNode,
  index: number,
  direction: D,
): NodeCaret<D> {
  let caret: NodeCaret<'next'> = $getDepthCaret(parent, 'next');
  for (let i = 0; i < index; i++) {
    const nextCaret: null | BreadthNodeCaret<LexicalNode, 'next'> =
      caret.getAdjacentCaret();
    if (nextCaret === null) {
      break;
    }
    caret = nextCaret;
  }
  return (direction === 'next' ? caret : caret.getFlipped()) as NodeCaret<D>;
}
