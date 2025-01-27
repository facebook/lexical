/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {LexicalNode, NodeKey} from '../LexicalNode';

import invariant from 'shared/invariant';

import {$isRootOrShadowRoot} from '../LexicalUtils';
import {$isElementNode, type ElementNode} from '../nodes/LexicalElementNode';
import {$isRootNode} from '../nodes/LexicalRootNode';
import {$isTextNode, TextNode} from '../nodes/LexicalTextNode';

export type CaretDirection = 'next' | 'previous';
export type FlipDirection<D extends CaretDirection> = typeof FLIP_DIRECTION[D];
export type CaretType = 'breadth' | 'depth';
export type RootMode = 'root' | 'shadowRoot';

const FLIP_DIRECTION = {
  next: 'previous',
  previous: 'next',
} as const;

/** @noInheritDoc */
export interface BaseNodeCaret<
  T extends LexicalNode,
  D extends CaretDirection,
  Type,
> extends Iterable<BreadthNodeCaret<LexicalNode, D>> {
  /** The origin node of this caret, typically this is what you will use in traversals */
  readonly origin: T;
  /** breadth for a BreadthNodeCaret (pointing at the next or previous sibling) or depth for a DepthNodeCaret (pointing at the first or last child) */
  readonly type: Type;
  /** next if pointing at the next sibling or first child, previous if pointing at the previous sibling or last child */
  readonly direction: D;
  /** Retun true if other is a caret with the same origin (by node key comparion), type, and direction */
  is: (other: NodeCaret | null) => boolean;
  /**
   * Get a new NodeCaret with the head and tail of its directional arrow flipped, such that flipping twice is the identity.
   * For example, given a non-empty parent with a firstChild and lastChild, and a second emptyParent node with no children:
   *
   * @example
   * ```
   * caret.getFlipped().getFlipped().is(caret) === true;
   * $getDepthCaret(parent, 'next').getFlipped().is($getBreadthCaret(firstChild, 'previous')) === true;
   * $getBreadthCaret(lastChild, 'next').getFlipped().is($getDepthCaret(parent, 'previous')) === true;
   * $getBreadthCaret(firstChild, 'next).getFlipped().is($getBreadthCaret(lastChild, 'previous')) === true;
   * $getDepthCaret(emptyParent, 'next').getFlipped().is($getDepthCaret(emptyParent, 'previous')) === true;
   * ```
   */
  getFlipped: () => NodeCaret<FlipDirection<D>>;
  /** Get the ElementNode that is the logical parent (`origin` for `DepthNodeCaret`, `origin.getParentOrThrow()` for `BreadthNodeCaret`) */
  getParentAtCaret: () => ElementNode;
  /** Get the node connected to the origin in the caret's direction, or null if there is no node */
  getNodeAtCaret: () => null | LexicalNode;
  /** Get a new BreadthNodeCaret from getNodeAtCaret() in the same direction. This is used for traversals, but only goes in the breadth (sibling) direction. */
  getAdjacentCaret: () => null | BreadthNodeCaret<LexicalNode, D>;
  /** Remove the getNodeAtCaret() node, if it exists */
  remove: () => this;
  /**
   * Insert a node connected to origin in this direction.
   * For a `BreadthNodeCaret` this is `origin.insertAfter(node)` for next, or `origin.insertBefore(node)` for previous.
   * For a `DepthNodeCaret` this is `origin.splice(0, 0, [node])` for next or `origin.append(node)` for previous.
   */
  insert: (node: LexicalNode) => this;
  /** If getNodeAtCaret() is null then replace it with node, otherwise insert node */
  replaceOrInsert: (node: LexicalNode, includeChildren?: boolean) => this;
  /**
   * Splice an iterable (typically an Array) of nodes into this location.
   *
   * @param deleteCount The number of existing nodes to replace or delete
   * @param nodes An iterable of nodes that will be inserted in this location, using replace instead of insert for the first deleteCount nodes
   * @param nodesDirection The direction of the nodes iterable, defaults to 'next'
   */
  splice: (
    deleteCount: number,
    nodes: Iterable<LexicalNode>,
    nodesDirection?: CaretDirection,
  ) => this;
}

/**
 * A RangeSelection expressed as a pair of Carets
 */
export interface NodeCaretRange<D extends CaretDirection = CaretDirection>
  extends Iterable<RangeNodeCaret<D>> {
  readonly type: 'node-caret-range';
  readonly direction: D;
  anchor: RangeNodeCaret<D>;
  focus: RangeNodeCaret<D>;
  /** Return true if anchor and focus are the same caret */
  isCollapsed: () => boolean;
  /**
   * Iterate the carets between anchor and focus in a pre-order fashion
   */
  internalCarets: (rootMode: RootMode) => IterableIterator<NodeCaret<D>>;
  /**
   * There are between zero and two non-empty TextSliceCarets for a
   * NodeCaretRange. Non-empty is defined by indexEnd > indexStart
   * (some text will be in the slice).
   *
   * 0: Neither anchor nor focus are non-empty TextNodeCarets
   * 1: One of anchor or focus are non-empty TextNodeCaret, or of the same origin
   * 2: Anchor and focus are both non-empty TextNodeCaret of different origin
   */
  getNonEmptyTextSlices: () => TextNodeCaretSliceTuple<D>;
  /**
   * There are between zero and two TextSliceCarets for a NodeCaretRange
   *
   * 0: Neither anchor nor focus are TextNodeCarets
   * 1: One of anchor or focus are TextNodeCaret, or of the same origin
   * 2: Anchor and focus are both TextNodeCaret of different origin
   */
  getTextSlices: () => TextNodeCaretSliceTuple<D>;
}

export interface StepwiseIteratorConfig<State, Stop, Value> {
  readonly initial: State | Stop;
  readonly stop: (value: State | Stop) => value is Stop;
  readonly step: (value: State) => State | Stop;
  readonly map: (value: State) => Value;
}

/**
 * A NodeCaret is the combination of an origin node and a direction
 * that points towards where a connected node will be fetched, inserted,
 * or replaced. A BreadthNodeCaret points from a node to its next or previous
 * sibling, and a DepthNodeCaret points to its first or last child
 * (using next or previous as direction, for symmetry with BreadthNodeCaret).
 *
 * The differences between NodeCaret and PointType are:
 * - NodeCaret can only be used to refer to an entire node. A PointType of text type can be used to refer to a specific location inside of a TextNode.
 * - NodeCaret stores an origin node, type (breadth or depth), and direction (next or previous). A PointType stores a type (text or element), the key of a node, and an offset within that node.
 * - NodeCaret is directional and always refers to a very specific node, eliminating all ambiguity. PointType can refer to the location before or after a node depending on context.
 * - NodeCaret is more robust to nearby mutations, as it relies only on a node's direct connections. An element Any change to the count of previous siblings in an element PointType will invalidate it.
 * - NodeCaret is designed to work more directly with the internal representation of the document tree, making it suitable for use in traversals without performing any redundant work.
 *
 * The caret does *not* update in response to any mutations, you should
 * not persist it across editor updates, and using a caret after its origin
 * node has been removed or replaced may result in runtime errors.
 */
export type NodeCaret<D extends CaretDirection = CaretDirection> =
  | BreadthNodeCaret<LexicalNode, D>
  | DepthNodeCaret<ElementNode, D>;

export type RangeNodeCaret<D extends CaretDirection = CaretDirection> =
  | TextNodeCaret<TextNode, D>
  | BreadthNodeCaret<LexicalNode, D>
  | DepthNodeCaret<ElementNode, D>;

/**
 * A BreadthNodeCaret points from an origin LexicalNode towards its next or previous sibling.
 */
export interface BreadthNodeCaret<
  T extends LexicalNode = LexicalNode,
  D extends CaretDirection = CaretDirection,
> extends BaseNodeCaret<T, D, 'breadth'> {
  /** Get a new caret with the latest origin pointer */
  getLatest: () => BreadthNodeCaret<T, D>;
  /**
   * If the origin of this node is an ElementNode, return the DepthNodeCaret of this origin in the same direction.
   * If the origin is not an ElementNode, this will return null.
   */
  getChildCaret: () => null | DepthNodeCaret<T & ElementNode, D>;
  /**
   * Get the caret in the same direction from the parent of this origin.
   *
   * @param mode 'root' to return null at the root, 'shadowRoot' to return null at the root or any shadow root
   * @returns A BreadthNodeCaret with the parent of this origin, or null if the parent is a root according to mode.
   */
  getParentCaret: (mode: RootMode) => null | BreadthNodeCaret<ElementNode, D>;
}

/**
 * A DepthNodeCaret points from an origin ElementNode towards its first or last child.
 */
export interface DepthNodeCaret<
  T extends ElementNode = ElementNode,
  D extends CaretDirection = CaretDirection,
> extends BaseNodeCaret<T, D, 'depth'> {
  /** Get a new caret with the latest origin pointer */
  getLatest: () => DepthNodeCaret<T, D>;
  getParentCaret: (mode: RootMode) => null | BreadthNodeCaret<T, D>;
  getParentAtCaret: () => T;
  /** Return this, the DepthNode is already a child caret of its origin */
  getChildCaret: () => this;
}

/**
 * A TextNodeCaret is a special case of a BreadthNodeCaret that also carries an offset
 * used for representing partially selected TextNode at the edges of a NodeCaretRange.
 *
 * The direction determines which part of the text is adjacent to the caret, if next
 * it's all of the text after offset. If previous, it's all of the text before offset.
 */
export interface TextNodeCaret<
  T extends TextNode = TextNode,
  D extends CaretDirection = CaretDirection,
> extends BreadthNodeCaret<T, D> {
  /** Get a new caret with the latest origin pointer */
  getLatest: () => TextNodeCaret<T, D>;
  readonly offset: number;
}

/**
 * A TextNodeCaretSlice is a wrapper for a TextNodeCaret that carries a size
 * representing the amount of text selected from the given caret. A negative
 * size means that text before offset is selected, a positive size means that
 * text after offset is selected. The offset+size pair is not affected in
 * any way by the direction of the caret.
 *
 * The selected string content can be computed as such:
 *
 * ```
 * slice.origin.getTextContent().slice(
 *   Math.min(slice.offset, slice.offset + slice.size),
 *   Math.max(slice.offset, slice.offset + slice.size),
 * )
 * ```
 */
export interface TextNodeCaretSlice<
  T extends TextNode = TextNode,
  D extends CaretDirection = CaretDirection,
> {
  readonly caret: TextNodeCaret<T, D>;
  readonly size: number;
}

export type TextNodeCaretSliceTuple<D extends CaretDirection> =
  readonly TextNodeCaretSlice<TextNode, D>[] & {length: 0 | 1 | 2};

abstract class AbstractCaret<
  T extends LexicalNode,
  D extends CaretDirection,
  Type,
> implements BaseNodeCaret<T, D, Type>
{
  abstract readonly type: Type;
  abstract readonly direction: D;
  readonly origin: T;
  abstract getNodeAtCaret(): null | LexicalNode;
  abstract insert(node: LexicalNode): this;
  abstract getFlipped(): NodeCaret<FlipDirection<D>>;
  abstract getParentAtCaret(): ElementNode;
  constructor(origin: T) {
    this.origin = origin;
  }
  is(other: NodeCaret | null): boolean {
    return (
      other !== null &&
      other.type === this.type &&
      other.direction === this.direction &&
      this.origin.is(other.origin)
    );
  }
  [Symbol.iterator](): IterableIterator<BreadthNodeCaret<LexicalNode, D>> {
    return makeStepwiseIterator({
      initial: this.getAdjacentCaret(),
      map: (caret) => caret,
      step: (caret: BreadthNodeCaret<LexicalNode, D>) =>
        caret.getAdjacentCaret(),
      stop: (v): v is null => v === null,
    });
  }
  getAdjacentCaret(): null | BreadthNodeCaret<LexicalNode, D> {
    return $getBreadthCaret(this.getNodeAtCaret(), this.direction);
  }
  remove(): this {
    const node = this.getNodeAtCaret();
    if (node) {
      node.remove();
    }
    return this;
  }
  replaceOrInsert(node: LexicalNode, includeChildren?: boolean): this {
    const target = this.getNodeAtCaret();
    if (node.is(this.origin) || node.is(target)) {
      // do nothing
    } else if (target === null) {
      this.insert(node);
    } else {
      target.replace(node, includeChildren);
    }
    return this;
  }
  splice(
    deleteCount: number,
    nodes: Iterable<LexicalNode>,
    nodesDirection: CaretDirection = 'next',
  ): this {
    const nodeIter =
      nodesDirection === this.direction ? nodes : Array.from(nodes).reverse();
    let caret: BreadthNodeCaret<LexicalNode, D> | this = this;
    const parent = this.getParentAtCaret();
    const nodesToRemove = new Map<NodeKey, LexicalNode>();
    // Find all of the nodes we expect to remove first, so
    // we don't have to worry about the cases where there is
    // overlap between the nodes to insert and the nodes to
    // remove
    for (
      let removeCaret = caret.getAdjacentCaret();
      removeCaret !== null && nodesToRemove.size < deleteCount;
      removeCaret = removeCaret.getAdjacentCaret()
    ) {
      const writableNode = removeCaret.origin.getWritable();
      nodesToRemove.set(writableNode.getKey(), writableNode);
    }
    // TODO: Optimize this to work directly with node internals
    for (const node of nodeIter) {
      if (nodesToRemove.size > 0) {
        // TODO: For some reason `npm run tsc-extension` needs this annotation?
        const target: null | LexicalNode = caret.getNodeAtCaret();
        invariant(
          target !== null,
          'NodeCaret.splice: Underflow of expected nodesToRemove during splice (keys: %s)',
          Array.from(nodesToRemove).join(' '),
        );
        nodesToRemove.delete(target.getKey());
        nodesToRemove.delete(node.getKey());
        if (target.is(node) || caret.origin.is(node)) {
          // do nothing, it's already in the right place
        } else {
          if (parent.is(node.getParent())) {
            // It's a sibling somewhere else in this node, so unparent it first
            node.remove();
          }
          target.replace(node);
        }
      } else {
        caret.insert(node);
      }
      caret = $getBreadthCaret(node, this.direction);
    }
    for (const node of nodesToRemove.values()) {
      node.remove();
    }
    return this;
  }
}

abstract class AbstractDepthNodeCaret<
    T extends ElementNode,
    D extends CaretDirection,
  >
  extends AbstractCaret<T, D, 'depth'>
  implements DepthNodeCaret<T, D>
{
  readonly type = 'depth';
  getLatest(): DepthNodeCaret<T, D> {
    const origin = this.origin.getLatest();
    return origin === this.origin
      ? this
      : $getDepthCaret(origin, this.direction);
  }
  /**
   * Get the BreadthNodeCaret from this origin in the same direction.
   *
   * @param mode 'root' to return null at the root, 'shadowRoot' to return null at the root or any shadow root
   * @returns A BreadthNodeCaret with this origin, or null if origin is a root according to mode.
   */
  getParentCaret(mode: RootMode): null | BreadthNodeCaret<T, D> {
    return $getBreadthCaret(
      $filterByMode(this.getParentAtCaret(), mode),
      this.direction,
    );
  }
  getFlipped(): NodeCaret<FlipDirection<D>> {
    const dir = flipDirection(this.direction);
    return (
      $getBreadthCaret(this.getNodeAtCaret(), dir) ||
      $getDepthCaret(this.origin, dir)
    );
  }
  getParentAtCaret(): T {
    return this.origin;
  }
  getChildCaret(): this {
    return this;
  }
}

class DepthNodeCaretFirst<T extends ElementNode> extends AbstractDepthNodeCaret<
  T,
  'next'
> {
  readonly direction = 'next';
  getNodeAtCaret(): null | LexicalNode {
    return this.origin.getFirstChild();
  }
  insert(node: LexicalNode): this {
    this.origin.splice(0, 0, [node]);
    return this;
  }
}

class DepthNodeCaretLast<T extends ElementNode> extends AbstractDepthNodeCaret<
  T,
  'previous'
> {
  readonly direction = 'previous';
  getNodeAtCaret(): null | LexicalNode {
    return this.origin.getLastChild();
  }
  insert(node: LexicalNode): this {
    this.origin.splice(this.origin.getChildrenSize(), 0, [node]);
    return this;
  }
}

const MODE_PREDICATE = {
  root: $isRootNode,
  shadowRoot: $isRootOrShadowRoot,
} as const;

export function flipDirection<D extends CaretDirection>(
  direction: D,
): FlipDirection<D> {
  return FLIP_DIRECTION[direction];
}

function $filterByMode<T extends ElementNode>(
  node: T | null,
  mode: RootMode,
): T | null {
  return MODE_PREDICATE[mode](node) ? null : node;
}

abstract class AbstractBreadthNodeCaret<
    T extends LexicalNode,
    D extends CaretDirection,
  >
  extends AbstractCaret<T, D, 'breadth'>
  implements BreadthNodeCaret<T, D>
{
  readonly type = 'breadth';
  // TextNodeCaret
  offset?: number;
  getLatest(): BreadthNodeCaret<T, D> {
    const origin = this.origin.getLatest();
    return origin === this.origin
      ? this
      : $getBreadthCaret(origin, this.direction);
  }

  getParentAtCaret(): ElementNode {
    return this.origin.getParentOrThrow();
  }
  getChildCaret(): DepthNodeCaret<T & ElementNode, D> | null {
    return $isElementNode(this.origin)
      ? $getDepthCaret(this.origin, this.direction)
      : null;
  }
  getParentCaret(mode: RootMode): BreadthNodeCaret<ElementNode, D> | null {
    return $getBreadthCaret(
      $filterByMode(this.getParentAtCaret(), mode),
      this.direction,
    );
  }
  getFlipped(): NodeCaret<FlipDirection<D>> {
    const dir = flipDirection(this.direction);
    return (
      $getBreadthCaret(this.getNodeAtCaret(), dir) ||
      $getDepthCaret(this.origin.getParentOrThrow(), dir)
    );
  }
}

export function $isTextNodeCaret<D extends CaretDirection>(
  caret: null | undefined | RangeNodeCaret<D>,
): caret is TextNodeCaret<TextNode, D> {
  return (
    caret instanceof AbstractBreadthNodeCaret &&
    $isTextNode(caret.origin) &&
    typeof caret.offset === 'number'
  );
}

export function $isSameTextNodeCaret<
  T extends TextNodeCaret<TextNode, CaretDirection>,
>(a: T, b: null | undefined | RangeNodeCaret<CaretDirection>): b is T {
  return $isTextNodeCaret(b) && a.is(b) && a.offset === b.offset;
}

export function $isNodeCaret<D extends CaretDirection>(
  caret: null | undefined | NodeCaret<D>,
) {
  return caret instanceof AbstractCaret;
}

export function $isBreadthNodeCaret<D extends CaretDirection>(
  caret: null | undefined | NodeCaret<D>,
): caret is BreadthNodeCaret<LexicalNode, D> {
  return caret instanceof AbstractBreadthNodeCaret;
}

export function $isDepthNodeCaret<D extends CaretDirection>(
  caret: null | undefined | NodeCaret<D>,
): caret is DepthNodeCaret<ElementNode, D> {
  return caret instanceof AbstractDepthNodeCaret;
}

class BreadthNodeCaretNext<
  T extends LexicalNode,
> extends AbstractBreadthNodeCaret<T, 'next'> {
  readonly direction = 'next';
  getNodeAtCaret(): null | LexicalNode {
    return this.origin.getNextSibling();
  }
  insert(node: LexicalNode): this {
    this.origin.insertAfter(node);
    return this;
  }
}

class BreadthNodeCaretPrevious<
  T extends LexicalNode,
> extends AbstractBreadthNodeCaret<T, 'previous'> {
  readonly direction = 'previous';
  getNodeAtCaret(): null | LexicalNode {
    return this.origin.getPreviousSibling();
  }
  insert(node: LexicalNode): this {
    this.origin.insertBefore(node);
    return this;
  }
}

const BREADTH_CTOR = {
  next: BreadthNodeCaretNext,
  previous: BreadthNodeCaretPrevious,
} as const;

const DEPTH_CTOR = {
  next: DepthNodeCaretFirst,
  previous: DepthNodeCaretLast,
};

/**
 * Get a caret that points at the next or previous sibling of the given origin node.
 *
 * @param origin The origin node
 * @param direction 'next' or 'previous'
 * @returns null if origin is null, otherwise a BreadthNodeCaret for this origin and direction
 */
export function $getBreadthCaret<
  T extends LexicalNode,
  D extends CaretDirection,
>(origin: T, direction: D): BreadthNodeCaret<T, D>;
export function $getBreadthCaret<
  T extends LexicalNode,
  D extends CaretDirection,
>(origin: T | null, direction: D): null | BreadthNodeCaret<T, D>;
export function $getBreadthCaret(
  origin: LexicalNode | null,
  direction: CaretDirection,
): BreadthNodeCaret<LexicalNode, CaretDirection> | null {
  return origin ? new BREADTH_CTOR[direction](origin) : null;
}

function $getLatestTextNodeCaret<T extends TextNode, D extends CaretDirection>(
  this: TextNodeCaret<T, D>,
): TextNodeCaret<T, D> {
  const origin = this.origin.getLatest();
  return origin === this.origin
    ? this
    : $getTextNodeCaret(origin, this.direction, this.offset);
}

function $getFlippedTextNodeCaret<T extends TextNode, D extends CaretDirection>(
  this: TextNodeCaret<T, D>,
): TextNodeCaret<T, FlipDirection<D>> {
  return $getTextNodeCaret(
    this.origin,
    flipDirection(this.direction),
    this.offset,
  );
}

export function $getTextNodeCaret<T extends TextNode, D extends CaretDirection>(
  origin: T,
  direction: D,
  offset: number | CaretDirection,
): TextNodeCaret<T, D> {
  const size = origin.getTextContentSize();
  const numericOffset =
    offset === 'next' ? size : offset === 'previous' ? 0 : offset;
  invariant(
    numericOffset >= 0 && numericOffset <= size,
    '$getTextNodeCaret: invalid offset %s for size %s',
    String(offset),
    String(size),
  );
  return Object.assign($getBreadthCaret(origin, direction), {
    getFlipped: $getFlippedTextNodeCaret,
    getLatest: $getLatestTextNodeCaret,
    offset: numericOffset,
  });
}

export function $getTextNodeCaretSlice<
  T extends TextNode,
  D extends CaretDirection,
>(caret: TextNodeCaret<T, D>, size: number): TextNodeCaretSlice<T, D> {
  return {caret, size};
}

/**
 * Get a caret that points at the first or last child of the given origin node,
 * which must be an ElementNode.
 *
 * @param origin The origin ElementNode
 * @param direction 'next' for first child or 'previous' for last child
 * @returns null if origin is null or not an ElementNode, otherwise a DepthNodeCaret for this origin and direction
 */
export function $getDepthCaret<T extends ElementNode, D extends CaretDirection>(
  origin: T,
  direction: D,
): DepthNodeCaret<T, D>;
export function $getDepthCaret(
  origin: null | LexicalNode,
  direction: CaretDirection,
): null | DepthNodeCaret<ElementNode, CaretDirection> {
  return $isElementNode(origin) ? new DEPTH_CTOR[direction](origin) : null;
}

/**
 * Gets the DepthNodeCaret if one is possible at this caret origin, otherwise return the caret
 */
export function $getChildCaretOrSelf<Caret extends NodeCaret | null>(
  caret: Caret,
): NodeCaret<NonNullable<Caret>['direction']> | (Caret & null) {
  return (caret && caret.getChildCaret()) || caret;
}

/**
 * Gets the adjacent caret, if not-null and if the origin of the adjacent caret is an ElementNode, then return
 * the DepthNodeCaret. This can be used along with the getParentAdjacentCaret method to perform a full DFS
 * style traversal of the tree.
 *
 * @param caret The caret to start at
 */
export function $getAdjacentDepthCaret<D extends CaretDirection>(
  caret: null | NodeCaret<D>,
): null | NodeCaret<D> {
  return caret && $getChildCaretOrSelf(caret.getAdjacentCaret());
}

class NodeCaretRangeImpl<D extends CaretDirection>
  implements NodeCaretRange<D>
{
  readonly type = 'node-caret-range';
  readonly direction: D;
  anchor: RangeNodeCaret<D>;
  focus: RangeNodeCaret<D>;
  constructor(
    anchor: RangeNodeCaret<D>,
    focus: RangeNodeCaret<D>,
    direction: D,
  ) {
    this.anchor = anchor;
    this.focus = focus;
    this.direction = direction;
  }
  getLatest(): NodeCaretRange<D> {
    const anchor = this.anchor.getLatest();
    const focus = this.focus.getLatest();
    return anchor === this.anchor && focus === this.focus
      ? this
      : new NodeCaretRangeImpl(anchor, focus, this.direction);
  }
  isCollapsed(): boolean {
    return (
      this.anchor.is(this.focus) &&
      !(
        $isTextNodeCaret(this.anchor) &&
        !$isSameTextNodeCaret(this.anchor, this.focus)
      )
    );
  }
  getNonEmptyTextSlices(): TextNodeCaretSliceTuple<D> {
    return this.getTextSlices().filter(
      (slice) => slice.size !== 0,
    ) as TextNodeCaretSliceTuple<D>;
  }
  getTextSlices(): TextNodeCaretSliceTuple<D> {
    const slices = (['anchor', 'focus'] as const).flatMap((k) => {
      const caret = this[k];
      return $isTextNodeCaret(caret)
        ? [$getSliceFromTextNodeCaret(caret, k)]
        : [];
    });
    if (slices.length === 2) {
      const [{caret: anchorCaret}, {caret: focusCaret}] = slices;
      if (anchorCaret.is(focusCaret)) {
        return [
          $getTextNodeCaretSlice(
            anchorCaret,
            focusCaret.offset - anchorCaret.offset,
          ),
        ];
      }
    }
    return slices as TextNodeCaretSliceTuple<D>;
  }
  internalCarets(rootMode: RootMode): IterableIterator<NodeCaret<D>> {
    const {anchor, focus} = this;
    const isTextFocus = $isTextNodeCaret(focus);
    const step = (state: NodeCaret<D>) =>
      state.is(focus)
        ? null
        : $getAdjacentDepthCaret(state) || state.getParentCaret(rootMode);
    return makeStepwiseIterator({
      initial: anchor.is(focus) ? null : step(anchor),
      map: (state) => state,
      step,
      stop: (state: null | RangeNodeCaret<D>): state is null =>
        state === null || (isTextFocus && focus.is(state)),
    });
  }
  [Symbol.iterator](): IterableIterator<NodeCaret<D>> {
    return this.internalCarets('root');
  }
}

function $getSliceFromTextNodeCaret<
  T extends TextNode,
  D extends CaretDirection,
>(
  caret: TextNodeCaret<T, D>,
  anchorOrFocus: 'anchor' | 'focus',
): TextNodeCaretSlice<T, D> {
  const offsetB =
    (caret.direction === 'next') === (anchorOrFocus === 'anchor')
      ? caret.origin.getTextContentSize()
      : 0;
  return {caret, size: offsetB - caret.offset};
}

export function $getCaretRange<D extends CaretDirection>(
  anchor: RangeNodeCaret<D>,
  focus: RangeNodeCaret<D>,
) {
  return new NodeCaretRangeImpl(anchor, focus, anchor.direction);
}

export function makeStepwiseIterator<State, Stop, Value>({
  initial,
  stop,
  step,
  map,
}: StepwiseIteratorConfig<State, Stop, Value>): IterableIterator<Value> {
  let state = initial;
  return {
    [Symbol.iterator]() {
      return this;
    },
    next(): IteratorResult<Value> {
      if (stop(state)) {
        return {done: true, value: undefined};
      }
      const rval = {done: false, value: map(state)};
      state = step(state);
      return rval;
    },
  };
}
