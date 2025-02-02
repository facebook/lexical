/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {LexicalNode, NodeKey} from '../LexicalNode';
import type {
  CaretDirection,
  CaretRange,
  ChildCaret,
  NodeCaret,
  PointCaret,
  RootMode,
  SiblingCaret,
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
import {$createTextNode, $isTextNode} from '../nodes/LexicalTextNode';
import {
  $getAdjacentChildCaret,
  $getCaretRange,
  $getChildCaret,
  $getSiblingCaret,
  $getTextNodeOffset,
  $getTextPointCaret,
  $isChildCaret,
  $isSiblingCaret,
  $isTextPointCaret,
  flipDirection,
} from './LexicalCaret';

/**
 * @param point
 * @returns a PointCaret for the point
 */
export function $caretFromPoint<D extends CaretDirection>(
  point: PointType,
  direction: D,
): PointCaret<D> {
  const {type, key, offset} = point;
  const node = $getNodeByKeyOrThrow(point.key);
  if (type === 'text') {
    invariant(
      $isTextNode(node),
      '$caretFromPoint: Node with type %s and key %s that does not inherit from TextNode encountered for text point',
      node.getType(),
      key,
    );
    return $getTextPointCaret(node, direction, offset);
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
 * Update the given point in-place from the PointCaret
 *
 * @param point the point to set
 * @param caret the caret to set the point from
 */
export function $setPointFromCaret<D extends CaretDirection>(
  point: PointType,
  caret: PointCaret<D>,
): void {
  const {origin, direction} = caret;
  const isNext = direction === 'next';
  if ($isSiblingCaret(caret)) {
    if ($isTextNode(origin)) {
      point.set(
        origin.getKey(),
        $isTextPointCaret(caret)
          ? caret.offset
          : $getTextNodeOffset(origin, direction),
        'text',
      );
    } else {
      point.set(
        origin.getParentOrThrow().getKey(),
        origin.getIndexWithinParent() + (isNext ? 1 : 0),
        'element',
      );
    }
  } else {
    invariant(
      $isChildCaret(caret) && $isElementNode(origin),
      '$setPointFromCaret: exhaustiveness check',
    );
    point.set(
      origin.getKey(),
      isNext ? 0 : origin.getChildrenSize(),
      'element',
    );
  }
}

/**
 * Set a RangeSelection on the editor from the given CaretRange
 *
 * @returns The new RangeSelection
 */
export function $setSelectionFromCaretRange(
  caretRange: CaretRange,
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
 * Update the points of a RangeSelection based on the given PointCaret.
 */
export function $updateRangeSelectionFromCaretRange(
  selection: RangeSelection,
  caretRange: CaretRange,
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
): CaretRange {
  const {anchor, focus} = selection;
  const direction = focus.isBefore(anchor) ? 'previous' : 'next';
  return $getCaretRange(
    $caretFromPoint(anchor, direction),
    $caretFromPoint(focus, direction),
  );
}

/**
 * Given a SiblingCaret we can always compute a caret that points to the
 * origin of that caret in the same direction. The adjacent caret of the
 * returned caret will be equivalent to the given caret.
 *
 * @example
 * ```ts
 * siblingCaret.is($rewindSiblingCaret(siblingCaret).getAdjacentCaret())
 * ```
 *
 * @param caret The caret to "rewind"
 * @returns A new caret (ChildCaret or SiblingCaret) with the same direction
 */
export function $rewindSiblingCaret<
  T extends LexicalNode,
  D extends CaretDirection,
>(caret: SiblingCaret<T, D>): NodeCaret<D> {
  const {direction, origin} = caret;
  // Rotate the direction around the origin and get the adjacent node
  const rewindOrigin = $getSiblingCaret(
    origin,
    flipDirection(direction),
  ).getNodeAtCaret();
  return rewindOrigin
    ? $getSiblingCaret(rewindOrigin, direction)
    : $getChildCaret(origin.getParentOrThrow(), direction);
}

function $getAnchorCandidates<D extends CaretDirection>(
  anchor: NodeCaret<D>,
  rootMode: RootMode = 'root',
): [NodeCaret<D>, ...NodeCaret<D>[]] {
  // These candidates will be the anchor itself, the pointer to the anchor (if different), and then any parents of that
  const carets: [NodeCaret<D>, ...NodeCaret<D>[]] = [anchor];
  for (
    let parent = $isChildCaret(anchor)
      ? anchor.getParentCaret(rootMode)
      : anchor;
    parent !== null;
    parent = parent.getParentCaret(rootMode)
  ) {
    carets.push($rewindSiblingCaret(parent));
  }
  return carets;
}

/**
 * Remove all text and nodes in the given range. If the range spans multiple
 * blocks then the remaining contents of the later block will be merged with
 * the earlier block.
 *
 * @param range The range to remove text and nodes from
 * @returns The new collapsed range (biased towards the earlier node)
 */
export function $removeTextFromCaretRange<D extends CaretDirection>(
  initialRange: CaretRange<D>,
): CaretRange<D> {
  if (initialRange.isCollapsed()) {
    return initialRange;
  }
  // Always process removals in document order
  const rootMode = 'root';
  const nextDirection = 'next';
  const range = $getCaretRangeInDirection(initialRange, nextDirection);

  const anchorCandidates = $getAnchorCandidates(range.anchor, rootMode);
  const focusCandidates = $getAnchorCandidates(
    range.focus.getFlipped(),
    rootMode,
  );

  // Mark the start of each ElementNode
  const seenStart = new Set<NodeKey>();
  // Queue removals since removing the only child can cascade to having
  // a parent remove itself which will affect iteration
  const removedNodes: LexicalNode[] = [];
  for (const caret of range.iterNodeCarets(rootMode)) {
    if ($isChildCaret(caret)) {
      seenStart.add(caret.origin.getKey());
    } else if ($isSiblingCaret(caret)) {
      const {origin} = caret;
      if (!$isElementNode(origin) || seenStart.has(origin.getKey())) {
        removedNodes.push(origin);
      }
    }
  }
  for (const node of removedNodes) {
    node.remove();
  }

  // Splice text at the anchor and/or origin.
  // If the text is entirely selected then it is removed.
  // If it's a token with a non-empty selection then it is removed.
  // Segmented nodes will be copied to a plain text node with the same format
  // and style and set to normal mode.
  for (const slice of range.getTextSlices()) {
    const {origin} = slice.caret;
    const contentSize = origin.getTextContentSize();
    const caretBefore = $rewindSiblingCaret(
      $getSiblingCaret(origin, nextDirection),
    );
    const mode = origin.getMode();
    if (
      Math.abs(slice.distance) === contentSize ||
      (mode === 'token' && slice.distance !== 0)
    ) {
      // anchorCandidates[1] should still be valid, it is caretBefore
      caretBefore.remove();
    } else if (slice.distance !== 0) {
      let nextCaret = slice.removeTextSlice();
      if (mode === 'segmented') {
        const src = nextCaret.origin;
        const plainTextNode = $createTextNode(src.getTextContent())
          .setStyle(src.getStyle())
          .setFormat(src.getFormat());
        caretBefore.replaceOrInsert(plainTextNode);
        nextCaret = $getTextPointCaret(
          plainTextNode,
          nextDirection,
          nextCaret.offset,
        );
      }
      if (anchorCandidates[0].is(slice.caret)) {
        anchorCandidates[0] = nextCaret;
      }
    }
  }

  for (const candidates of [anchorCandidates, focusCandidates]) {
    const deleteCount = candidates.findIndex((caret) =>
      caret.origin.isAttached(),
    );
    candidates.splice(0, deleteCount);
  }

  const anchorCandidate = anchorCandidates.find((v) => v.origin.isAttached());
  const focusCandidate = focusCandidates.find((v) => v.origin.isAttached());

  // Merge blocks if necessary
  const anchorBlock =
    anchorCandidate && $getAncestor(anchorCandidate.origin, INTERNAL_$isBlock);
  const focusBlock =
    focusCandidate && $getAncestor(focusCandidate.origin, INTERNAL_$isBlock);
  if (
    $isElementNode(focusBlock) &&
    seenStart.has(focusBlock.getKey()) &&
    $isElementNode(anchorBlock)
  ) {
    // always merge blocks later in the document with
    // blocks earlier in the document
    $getChildCaret(anchorBlock, 'previous').splice(0, focusBlock.getChildren());
    focusBlock.remove();
  }

  for (const caret of [anchorCandidate, focusCandidate]) {
    if (caret && caret.origin.isAttached()) {
      const anchor = $getCaretInDirection(
        $normalizeCaret(caret),
        initialRange.direction,
      );
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
 * Return the deepest ChildCaret that has initialCaret's origin
 * as an ancestor, or initialCaret if the origin is not an ElementNode
 * or is already the deepest ChildCaret.
 *
 * This is generally used when normalizing because there is
 * "zero distance" between these locations.
 *
 * @param initialCaret
 * @returns Either a deeper ChildCaret or the given initialCaret
 */
function $getDeepestChildOrSelf<
  Caret extends null | PointCaret<CaretDirection>,
>(
  initialCaret: Caret,
): ChildCaret<ElementNode, NonNullable<Caret>['direction']> | Caret {
  let caret: ChildCaret<ElementNode, NonNullable<Caret>['direction']> | Caret =
    initialCaret;
  while ($isChildCaret(caret)) {
    const adjacent = $getAdjacentChildCaret(caret);
    if (!$isChildCaret(adjacent)) {
      break;
    }
    caret = adjacent;
  }
  return caret;
}

/**
 * Normalize a caret to the deepest equivalent PointCaret.
 * This will return a TextPointCaret with the offset set according
 * to the direction if given a caret with a TextNode origin
 * or a caret with an ElementNode origin with the deepest ChildCaret
 * having an adjacent TextNode.
 *
 * If given a TextPointCaret, it will be returned, as no normalization
 * is required when an offset is already present.
 *
 * @param initialCaret
 * @returns The normalized PointCaret
 */
export function $normalizeCaret<D extends CaretDirection>(
  initialCaret: PointCaret<D>,
): PointCaret<D> {
  const caret = $getDeepestChildOrSelf(initialCaret.getLatest());
  const {direction} = caret;
  if ($isTextNode(caret.origin)) {
    return $isTextPointCaret(caret)
      ? caret
      : $getTextPointCaret(caret.origin, direction, direction);
  }
  const adj = caret.getAdjacentCaret();
  return $isSiblingCaret(adj) && $isTextNode(adj.origin)
    ? $getTextPointCaret(adj.origin, direction, flipDirection(direction))
    : caret;
}

/**
 * Return the caret if it's in the given direction, otherwise return
 * caret.getFlipped().
 *
 * @param caret Any PointCaret
 * @param direction The desired direction
 * @returns A PointCaret in direction
 */
export function $getCaretInDirection<D extends CaretDirection>(
  caret: PointCaret<CaretDirection>,
  direction: D,
): PointCaret<D> {
  return (
    caret.direction === direction ? caret : caret.getFlipped()
  ) as PointCaret<D>;
}

/**
 * Return the range if it's in the given direction, otherwise
 * construct a new range using a flipped focus as the anchor
 * and a flipped anchor as the focus. This transformation
 * preserves the section of the document that it's working
 * with, but reverses the order of iteration.
 *
 * @param range Any CaretRange
 * @param direction The desired direction
 * @returns A CaretRange in direction
 */
export function $getCaretRangeInDirection<D extends CaretDirection>(
  range: CaretRange<CaretDirection>,
  direction: D,
): CaretRange<D> {
  if (range.direction === direction) {
    return range as CaretRange<D>;
  }
  return $getCaretRange(
    // focus and anchor get flipped here
    $getCaretInDirection(range.focus, direction),
    $getCaretInDirection(range.anchor, direction),
  );
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
  let caret: NodeCaret<'next'> = $getChildCaret(parent, 'next');
  for (let i = 0; i < index; i++) {
    const nextCaret: null | SiblingCaret<LexicalNode, 'next'> =
      caret.getAdjacentCaret();
    if (nextCaret === null) {
      break;
    }
    caret = nextCaret;
  }
  return (direction === 'next' ? caret : caret.getFlipped()) as NodeCaret<D>;
}

/**
 * Returns the Node sibling when this exists, otherwise the closest parent sibling. For example
 * R -> P -> T1, T2
 *   -> P2
 * returns T2 for node T1, P2 for node T2, and null for node P2.
 * @param node LexicalNode.
 * @returns An array (tuple) containing the found Lexical node and the depth difference, or null, if this node doesn't exist.
 */
export function $getAdjacentSiblingOrParentSiblingCaret<
  D extends CaretDirection,
>(
  startCaret: NodeCaret<D>,
  rootMode: RootMode = 'root',
): null | [NodeCaret<D>, number] {
  let depthDiff = 0;
  let caret = startCaret;
  let nextCaret = $getAdjacentChildCaret(caret);
  while (nextCaret === null) {
    depthDiff--;
    nextCaret = caret.getParentCaret(rootMode);
    if (!nextCaret) {
      return null;
    }
    caret = nextCaret;
    nextCaret = $getAdjacentChildCaret(caret);
  }
  return nextCaret && [nextCaret, depthDiff];
}
