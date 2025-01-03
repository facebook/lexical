/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {LexicalNode, NodeKey} from './LexicalNode';
import type {PointType, RangeSelection} from './LexicalSelection';

import invariant from 'shared/invariant';

import {$getNodeByKeyOrThrow, $isRootOrShadowRoot} from './LexicalUtils';
import {$isElementNode, type ElementNode} from './nodes/LexicalElementNode';
import {$isRootNode} from './nodes/LexicalRootNode';
import {$isTextNode} from './nodes/LexicalTextNode';

export type CaretDirection = 'next' | 'previous';
export type FlipDirection<D extends CaretDirection> = typeof FLIP_DIRECTION[D];
export type CaretType = 'breadth' | 'depth';
export type RootMode = 'root' | 'shadowRoot';

const FLIP_DIRECTION = {
  next: 'previous',
  previous: 'next',
} as const;

interface BaseNodeCaret<T extends LexicalNode, D extends CaretDirection>
  extends Iterable<BreadthNodeCaret<LexicalNode, D>> {
  /** The origin node of this caret, typically this is what you will use in traversals */
  readonly origin: T;
  /** breadth for a BreadthNodeCaret (pointing at the next or previous sibling) or depth for a DepthNodeCaret (pointing at the first or last child) */
  readonly type: CaretType;
  /** next if pointing at the next sibling or first child, previous if pointing at the previous sibling or last child */
  readonly direction: D;
  /** Retun true if other is a caret with the same origin (by node key comparion), type, and direction */
  is(other: NodeCaret | null): boolean;
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
  getFlipped(): NodeCaret<FlipDirection<D>>;
  /** Get the ElementNode that is the logical parent (`origin` for `DepthNodeCaret`, `origin.getParentOrThrow()` for `BreadthNodeCaret`) */
  getParentAtCaret(): ElementNode;
  /** Get the node connected to the origin in the caret's direction, or null if there is no node */
  getNodeAtCaret(): null | LexicalNode;
  /** Get a new BreadthNodeCaret from getNodeAtCaret() in the same direction. This is used for traversals, but only goes in the breadth (sibling) direction. */
  getAdjacentCaret(): null | BreadthNodeCaret<LexicalNode, D>;
  /** Remove the getNodeAtCaret() node, if it exists */
  remove(): this;
  /**
   * Insert a node connected to origin in this direction.
   * For a `BreadthNodeCaret` this is `origin.insertAfter(node)` for next, or `origin.insertBefore(node)` for previous.
   * For a `DepthNodeCaret` this is `origin.splice(0, 0, [node])` for next or `origin.append(node)` for previous.
   */
  insert(node: LexicalNode): this;
  /** If getNodeAtCaret() is null then replace it with node, otherwise insert node */
  replaceOrInsert(node: LexicalNode, includeChildren?: boolean): this;
  /**
   * Splice an iterable (typically an Array) of nodes into this location.
   *
   * @param deleteCount The number of existing nodes to replace or delete
   * @param nodes An iterable of nodes that will be inserted in this location, using replace instead of insert for the first deleteCount nodes
   * @param nodesDirection The direction of the nodes iterable, defaults to 'next'
   */
  splice(
    deleteCount: number,
    nodes: Iterable<LexicalNode>,
    nodesDirection?: CaretDirection,
  ): this;
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

/**
 * A BreadthNodeCaret points from an origin LexicalNode towards its next or previous sibling.
 */
export interface BreadthNodeCaret<
  T extends LexicalNode = LexicalNode,
  D extends CaretDirection = CaretDirection,
> extends BaseNodeCaret<T, D> {
  readonly type: 'breadth';
  /**
   * If the origin of this node is an ElementNode, return the DepthNodeCaret of this origin in the same direction.
   * If the origin is not an ElementNode, this will return null.
   */
  getChildCaret(): DepthNodeCaret<T & ElementNode, D> | null;
  /**
   * Get the caret in the same direction from the parent of this origin.
   *
   * @param mode 'root' to return null at the root, 'shadowRoot' to return null at the root or any shadow root
   * @returns A BreadthNodeCaret with the parent of this origin, or null if the parent is a root according to mode.
   */
  getParentCaret(mode: RootMode): null | BreadthNodeCaret<ElementNode, D>;
}

/**
 * A DepthNodeCaret points from an origin ElementNode towards its first or last child.
 */
export interface DepthNodeCaret<
  T extends ElementNode = ElementNode,
  D extends CaretDirection = CaretDirection,
> extends BaseNodeCaret<T, D> {
  readonly type: 'depth';
  getParentCaret(mode: RootMode): null | BreadthNodeCaret<T, D>;
  getParentAtCaret(): T;
}

abstract class AbstractCaret<T extends LexicalNode, D extends CaretDirection>
  implements BaseNodeCaret<T, D>
{
  abstract readonly type: CaretType;
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
  [Symbol.iterator](): Iterator<BreadthNodeCaret<LexicalNode, D>> {
    let caret = this.getAdjacentCaret();
    return {
      next(): IteratorResult<BreadthNodeCaret<LexicalNode, D>> {
        if (!caret) {
          return {done: true, value: undefined};
        }
        const rval = {done: false, value: caret};
        caret = caret.getAdjacentCaret();
        return rval;
      },
    };
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
        const target = caret.getNodeAtCaret();
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
  extends AbstractCaret<T, D>
  implements DepthNodeCaret<T, D>
{
  readonly type = 'depth';
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
  getFlipped(): NodeCaret<typeof FLIP_DIRECTION[D]> {
    const dir = FLIP_DIRECTION[this.direction];
    return (
      $getBreadthCaret(this.getNodeAtCaret(), dir) ||
      $getDepthCaret(this.origin, dir)
    );
  }
  getParentAtCaret(): T {
    return this.origin;
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
  extends AbstractCaret<T, D>
  implements BreadthNodeCaret<T, D>
{
  readonly type = 'breadth';
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
    const dir = FLIP_DIRECTION[this.direction];
    return (
      $getBreadthCaret(this.getNodeAtCaret(), dir) ||
      $getDepthCaret(this.origin.getParentOrThrow(), dir)
    );
  }
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

/**
 * Get a caret that points at the first or last child of the given origin node,
 * which must be an ElementNode.
 *
 * @param origin The origin ElementNode
 * @param direction 'next' for first child or 'previous' for last child
 * @returns null if origin is null or not an ElementNode, otherwise a DepthNodeCaret for this origin and direction
 */
export function $getDepthCaret<T extends ElementNode, D extends CaretDirection>(
  node: T,
  direction: D,
): DepthNodeCaret<T, D>;
export function $getDepthCaret(
  node: LexicalNode | null,
  direction: CaretDirection,
): null | DepthNodeCaret<ElementNode, CaretDirection> {
  return $isElementNode(node) ? new DEPTH_CTOR[direction](node) : null;
}

/**
 * Get a 'next' caret for the child at the given index, or the last
 * caret in that node if out of bounds
 *
 * @param parent An ElementNode
 * @param index The index of the origin for the caret
 * @returns A next caret with the arrow at that index
 */
export function $getChildCaretAtIndex<T extends ElementNode>(
  parent: T,
  index: number,
): NodeCaret<'next'> {
  let caret: NodeCaret<'next'> = $getDepthCaret(parent, 'next');
  for (let i = 0; i < index; i++) {
    const nextCaret: null | BreadthNodeCaret<LexicalNode, 'next'> =
      caret.getAdjacentCaret();
    if (nextCaret === null) {
      break;
    }
    caret = nextCaret;
  }
  return caret;
}

class CaretRangeImpl<D extends CaretDirection> implements CaretRange<D> {
  readonly type = 'caret-range';
  readonly direction: D;
  anchor: NodeCaret<D>;
  focus: NodeCaret<D>;
  constructor(anchor: NodeCaret<D>, focus: NodeCaret<D>, direction: D) {
    this.anchor = anchor;
    this.focus = focus;
    this.direction = direction;
  }
  isCollapsed(): boolean {
    return this.anchor.is(this.focus);
  }
}

function $caretRangeFromStartEnd(
  startCaret: NodeCaret<'next'>,
  endCaret: NodeCaret<'next'>,
  direction: CaretDirection,
): CaretRange {
  if (direction === 'next') {
    return new CaretRangeImpl(startCaret, endCaret, direction);
  } else {
    return new CaretRangeImpl(
      endCaret.getFlipped(),
      startCaret.getFlipped(),
      direction,
    );
  }
}

/**
 * A RangeSelection expressed as a pair of Carets
 */
export interface CaretRange<D extends CaretDirection = CaretDirection> {
  readonly type: 'caret-range';
  readonly direction: D;
  anchor: NodeCaret<D>;
  focus: NodeCaret<D>;
  isCollapsed(): boolean;
}

/**
 * Since a NodeCaret can only represent a whole node, when a text PointType
 * is encountered the caret will lie before the text node if it is non-empty
 * and offset === 0, otherwise it will lie after the node.
 *
 * @param point
 * @returns a NodeCaret for the point
 */
export function $caretFromPoint(point: PointType): NodeCaret<'next'> {
  const {type, key, offset} = point;
  const node = $getNodeByKeyOrThrow(point.key);
  if (type === 'text') {
    invariant(
      $isTextNode(node),
      '$caretFromPoint: Node with type %s and key %s that does not inherit from TextNode encountered for text point',
      node.getType(),
      key,
    );
    return offset === 0 && node.getTextContentSize() > 0
      ? $getBreadthCaret(node, 'next')
      : $getBreadthCaret(node, 'previous').getFlipped();
  }
  invariant(
    $isElementNode(node),
    '$caretToPoint: Node with type %s and key %s that does not inherit from ElementNode encountered for element point',
    node.getType(),
    key,
  );
  return $getChildCaretAtIndex(node, point.offset);
}

/**
 * Get a pair of carets for a RangeSelection. Since a NodeCaret can
 * only represent a whole node, when a text PointType is encountered
 * the caret will be moved to before or after the node depending
 * on where the other point lies.
 *
 * If the focus is before the anchor, then the direction will be
 * 'previous', otherwise the direction will be 'next'.
 */
export function $caretRangeFromSelection(
  selection: RangeSelection,
): CaretRange {
  const direction = selection.isBackward() ? 'previous' : 'next';
  let startCaret: NodeCaret<'next'>;
  let endCaret: NodeCaret<'next'>;
  if (
    selection.anchor.type === 'text' &&
    selection.focus.type === 'text' &&
    selection.anchor.key === selection.focus.key &&
    selection.anchor.offset !== selection.focus.offset
  ) {
    const node = $getNodeByKeyOrThrow(selection.anchor.key);
    // handle edge case where the start and end are on the same TextNode
    startCaret = $getBreadthCaret(node, 'previous').getFlipped();
    endCaret = $getBreadthCaret(node, 'next');
  } else {
    const [startPoint, endPoint] =
      direction === 'next'
        ? [selection.anchor, selection.focus]
        : [selection.focus, selection.anchor];
    startCaret = $caretFromPoint(startPoint);
    endCaret = $caretFromPoint(endPoint);
  }
  return $caretRangeFromStartEnd(startCaret, endCaret, direction);
}
