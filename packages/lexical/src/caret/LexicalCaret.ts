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

/**
 * The direction of a caret, 'next' points towards the end of the document
 * and 'previous' points towards the beginning
 */
export type CaretDirection = 'next' | 'previous';
/**
 * A type utility to flip next and previous
 */
export type FlipDirection<D extends CaretDirection> = typeof FLIP_DIRECTION[D];
/**
 * A breadth caret type points from a LexicalNode origin to its next or previous sibling,
 * and a depth caret type points from an ElementNode origin to its first or last child.
 */
export type CaretType = 'breadth' | 'depth';
/**
 * The RootMode is specified in all caret traversals where the traversal can go up
 * towards the root. 'root' means that it will stop at the document root,
 * and 'shadowRoot' will stop at the document root or any shadow root
 * (per {@link $isRootOrShadowRoot}).
 */
export type RootMode = 'root' | 'shadowRoot';

const FLIP_DIRECTION = {
  next: 'previous',
  previous: 'next',
} as const;

/** @noInheritDoc */
export interface BaseCaret<
  T extends LexicalNode,
  D extends CaretDirection,
  Type,
> extends Iterable<BreadthCaret<LexicalNode, D>> {
  /** The origin node of this caret, typically this is what you will use in traversals */
  readonly origin: T;
  /** breadth for a BreadthCaret (pointing at the next or previous sibling) or depth for a DepthCaret (pointing at the first or last child) */
  readonly type: Type;
  /** next if pointing at the next sibling or first child, previous if pointing at the previous sibling or last child */
  readonly direction: D;
  /**
   * Retun true if other is a caret with the same origin (by node key comparion), type, and direction.
   *
   * Note that this will not check the offset of a TextPointCaret because it is otherwise indistinguishable
   * from a BreadthCaret. Use {@link $isSameTextPointCaret} for that specific scenario.
   */
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
  /** Get the ElementNode that is the logical parent (`origin` for `DepthCaret`, `origin.getParent()` for `BreadthCaret`) */
  getParentAtCaret: () => null | ElementNode;
  /** Get the node connected to the origin in the caret's direction, or null if there is no node */
  getNodeAtCaret: () => null | LexicalNode;
  /** Get a new BreadthCaret from getNodeAtCaret() in the same direction. This is used for traversals, but only goes in the breadth (sibling) direction. */
  getAdjacentCaret: () => null | BreadthCaret<LexicalNode, D>;
  /** Remove the getNodeAtCaret() node, if it exists */
  remove: () => this;
  /**
   * Insert a node connected to origin in this direction.
   * For a `BreadthCaret` this is `origin.insertAfter(node)` for next, or `origin.insertBefore(node)` for previous.
   * For a `DepthCaret` this is `origin.splice(0, 0, [node])` for next or `origin.append(node)` for previous.
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
export interface CaretRange<D extends CaretDirection = CaretDirection>
  extends Iterable<PointCaret<D>> {
  readonly type: 'node-caret-range';
  readonly direction: D;
  anchor: PointCaret<D>;
  focus: PointCaret<D>;
  /** Return true if anchor and focus are the same caret */
  isCollapsed: () => boolean;
  /**
   * Iterate the carets between anchor and focus in a pre-order fashion, node
   * that this does not include any text slices represented by the anchor and/or
   * focus. Those are accessed separately from getTextSlices.
   */
  iterNodeCarets: (rootMode: RootMode) => IterableIterator<NodeCaret<D>>;
  /**
   * There are between zero and two non-empty TextSliceCarets for a
   * CaretRange. Non-empty is defined by indexEnd > indexStart
   * (some text will be in the slice).
   *
   * 0: Neither anchor nor focus are non-empty TextPointCarets
   * 1: One of anchor or focus are non-empty TextPointCaret, or of the same origin
   * 2: Anchor and focus are both non-empty TextPointCaret of different origin
   */
  getNonEmptyTextSlices: () => TextPointCaretSliceTuple<D>;
  /**
   * There are between zero and two TextSliceCarets for a CaretRange
   *
   * 0: Neither anchor nor focus are TextPointCarets
   * 1: One of anchor or focus are TextPointCaret, or of the same origin
   * 2: Anchor and focus are both TextPointCaret of different origin
   */
  getTextSlices: () => TextPointCaretSliceTuple<D>;
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
 * or replaced. A BreadthCaret points from a node to its next or previous
 * sibling, and a DepthCaret points to its first or last child
 * (using next or previous as direction, for symmetry with BreadthCaret).
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
  | BreadthCaret<LexicalNode, D>
  | DepthCaret<ElementNode, D>;

/**
 * A PointCaret is a NodeCaret that also includes a specialized
 * TextPointCaret type which refers to a specific offset of a TextNode.
 * This type is separate because it is not relevant to general node traversal
 * so it doesn't make sense to have it show up except when defining
 * a CaretRange and in those cases there will be at most two of them only
 * at the boundaries.
 */
export type PointCaret<D extends CaretDirection = CaretDirection> =
  | TextPointCaret<TextNode, D>
  | BreadthCaret<LexicalNode, D>
  | DepthCaret<ElementNode, D>;

/**
 * A BreadthCaret points from an origin LexicalNode towards its next or previous sibling.
 */
export interface BreadthCaret<
  T extends LexicalNode = LexicalNode,
  D extends CaretDirection = CaretDirection,
> extends BaseCaret<T, D, 'breadth'> {
  /** Get a new caret with the latest origin pointer */
  getLatest: () => BreadthCaret<T, D>;
  /**
   * If the origin of this node is an ElementNode, return the DepthCaret of this origin in the same direction.
   * If the origin is not an ElementNode, this will return null.
   */
  getChildCaret: () => null | DepthCaret<T & ElementNode, D>;
  /**
   * Get the caret in the same direction from the parent of this origin.
   *
   * @param mode 'root' to return null at the root, 'shadowRoot' to return null at the root or any shadow root
   * @returns A BreadthCaret with the parent of this origin, or null if the parent is a root according to mode.
   */
  getParentCaret: (mode: RootMode) => null | BreadthCaret<ElementNode, D>;
}

/**
 * A DepthCaret points from an origin ElementNode towards its first or last child.
 */
export interface DepthCaret<
  T extends ElementNode = ElementNode,
  D extends CaretDirection = CaretDirection,
> extends BaseCaret<T, D, 'depth'> {
  /** Get a new caret with the latest origin pointer */
  getLatest: () => DepthCaret<T, D>;
  getParentCaret: (mode: RootMode) => null | BreadthCaret<T, D>;
  getParentAtCaret: () => T;
  /** Return this, the DepthNode is already a child caret of its origin */
  getChildCaret: () => this;
}

/**
 * A TextPointCaret is a special case of a BreadthCaret that also carries
 * an offset used for representing partially selected TextNode at the edges
 * of a CaretRange.
 *
 * The direction determines which part of the text is adjacent to the caret,
 * if next it's all of the text after offset. If previous, it's all of the
 * text before offset.
 *
 * While this can be used in place of any BreadthCaret of a TextNode,
 * the offset into the text will be ignored except in contexts that
 * specifically use the TextPointCaret or PointCaret types.
 */
export interface TextPointCaret<
  T extends TextNode = TextNode,
  D extends CaretDirection = CaretDirection,
> extends BreadthCaret<T, D> {
  /** Get a new caret with the latest origin pointer */
  getLatest: () => TextPointCaret<T, D>;
  readonly offset: number;
}

/**
 * A TextPointCaretSlice is a wrapper for a TextPointCaret that carries a signed
 * distance representing the direction and amount of text selected from the given
 * caret. A negative distance means that text before offset is selected, a
 * positive distance means that text after offset is selected. The offset+distance
 * pair is not affected in any way by the direction of the caret.
 *
 * The selected string content can be computed as such
 * (see also {@link $getTextSliceContent}):
 *
 * ```
 * slice.origin.getTextContent().slice(
 *   Math.min(slice.offset, slice.offset + slice.distance),
 *   Math.max(slice.offset, slice.offset + slice.distance),
 * )
 * ```
 */
export interface TextPointCaretSlice<
  T extends TextNode = TextNode,
  D extends CaretDirection = CaretDirection,
> {
  readonly caret: TextPointCaret<T, D>;
  readonly distance: number;
}

/**
 * A utility type to specify that a CaretRange may have zero,
 * one, or two associated TextPointCaretSlice.
 */
export type TextPointCaretSliceTuple<D extends CaretDirection> =
  readonly TextPointCaretSlice<TextNode, D>[] & {length: 0 | 1 | 2};

abstract class AbstractCaret<
  T extends LexicalNode,
  D extends CaretDirection,
  Type,
> implements BaseCaret<T, D, Type>
{
  abstract readonly type: Type;
  abstract readonly direction: D;
  readonly origin: T;
  abstract getNodeAtCaret(): null | LexicalNode;
  abstract insert(node: LexicalNode): this;
  abstract getFlipped(): NodeCaret<FlipDirection<D>>;
  abstract getParentAtCaret(): null | ElementNode;
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
  [Symbol.iterator](): IterableIterator<BreadthCaret<LexicalNode, D>> {
    return makeStepwiseIterator({
      initial: this.getAdjacentCaret(),
      map: (caret) => caret,
      step: (caret: BreadthCaret<LexicalNode, D>) => caret.getAdjacentCaret(),
      stop: (v): v is null => v === null,
    });
  }
  getAdjacentCaret(): null | BreadthCaret<LexicalNode, D> {
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
    let caret: BreadthCaret<LexicalNode, D> | this = this;
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
        if (target) {
          nodesToRemove.delete(target.getKey());
          nodesToRemove.delete(node.getKey());
          if (target.is(node) || caret.origin.is(node)) {
            // do nothing, it's already in the right place
          } else {
            const nodeParent = node.getParent();
            if (nodeParent && nodeParent.is(parent)) {
              // It's a sibling somewhere else in this node, so unparent it first
              node.remove();
            }
            target.replace(node);
          }
        } else {
          invariant(
            target !== null,
            'NodeCaret.splice: Underflow of expected nodesToRemove during splice (keys: %s)',
            Array.from(nodesToRemove).join(' '),
          );
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

abstract class AbstractDepthCaret<
    T extends ElementNode,
    D extends CaretDirection,
  >
  extends AbstractCaret<T, D, 'depth'>
  implements DepthCaret<T, D>
{
  readonly type = 'depth';
  getLatest(): DepthCaret<T, D> {
    const origin = this.origin.getLatest();
    return origin === this.origin
      ? this
      : $getDepthCaret(origin, this.direction);
  }
  /**
   * Get the BreadthCaret from this origin in the same direction.
   *
   * @param mode 'root' to return null at the root, 'shadowRoot' to return null at the root or any shadow root
   * @returns A BreadthCaret with this origin, or null if origin is a root according to mode.
   */
  getParentCaret(mode: RootMode): null | BreadthCaret<T, D> {
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

class DepthCaretFirst<T extends ElementNode> extends AbstractDepthCaret<
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

class DepthCaretLast<T extends ElementNode> extends AbstractDepthCaret<
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

/**
 * Flip a direction ('next' -> 'previous'; 'previous' -> 'next').
 *
 * Note that TypeScript can't prove that FlipDirection is its own
 * inverse (but if you have a concrete 'next' or 'previous' it will
 * simplify accordingly).
 *
 * @param direction A direction
 * @returns The opposite direction
 */
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

abstract class AbstractBreadthCaret<
    T extends LexicalNode,
    D extends CaretDirection,
  >
  extends AbstractCaret<T, D, 'breadth'>
  implements BreadthCaret<T, D>
{
  readonly type = 'breadth';
  // TextPointCaret
  offset?: number;
  getLatest(): BreadthCaret<T, D> {
    const origin = this.origin.getLatest();
    return origin === this.origin
      ? this
      : $getBreadthCaret(origin, this.direction);
  }
  getParentAtCaret(): null | ElementNode {
    return this.origin.getParent();
  }
  getChildCaret(): DepthCaret<T & ElementNode, D> | null {
    return $isElementNode(this.origin)
      ? $getDepthCaret(this.origin, this.direction)
      : null;
  }
  getParentCaret(mode: RootMode): BreadthCaret<ElementNode, D> | null {
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

/**
 * Guard to check if the given caret is specifically a TextPointCaret
 *
 * @param caret Any caret
 * @returns true if it is a TextPointCaret
 */
export function $isTextPointCaret<D extends CaretDirection>(
  caret: null | undefined | PointCaret<D>,
): caret is TextPointCaret<TextNode, D> {
  return (
    caret instanceof AbstractBreadthCaret &&
    $isTextNode(caret.origin) &&
    typeof caret.offset === 'number'
  );
}

/**
 * Guard to check the equivalence of TextPointCaret
 *
 * @param a The caret known to be a TextPointCaret
 * @param b Any caret
 * @returns true if b is a TextPointCaret with the same origin, direction and offset as a
 */
export function $isSameTextPointCaret<
  T extends TextPointCaret<TextNode, CaretDirection>,
>(a: T, b: null | undefined | PointCaret<CaretDirection>): b is T {
  return $isTextPointCaret(b) && a.is(b) && a.offset === b.offset;
}

/**
 * Guard to check if the given argument is any type of caret
 *
 * @param caret
 * @returns true if caret is any type of caret
 */
export function $isNodeCaret<D extends CaretDirection>(
  caret: null | undefined | PointCaret<D>,
): caret is PointCaret<D> {
  return caret instanceof AbstractCaret;
}

/**
 * Guard to check if the given argument is specifically a BreadthCaret (or TextPointCaret)
 *
 * @param caret
 * @returns true if caret is a BreadthCaret
 */
export function $isBreadthCaret<D extends CaretDirection>(
  caret: null | undefined | PointCaret<D>,
): caret is BreadthCaret<LexicalNode, D> {
  return caret instanceof AbstractBreadthCaret;
}

/**
 * Guard to check if the given argument is specifically a DepthCaret

 * @param caret 
 * @returns true if caret is a DepthCaret
 */
export function $isDepthCaret<D extends CaretDirection>(
  caret: null | undefined | PointCaret<D>,
): caret is DepthCaret<ElementNode, D> {
  return caret instanceof AbstractDepthCaret;
}

class BreadthCaretNext<T extends LexicalNode> extends AbstractBreadthCaret<
  T,
  'next'
> {
  readonly direction = 'next';
  getNodeAtCaret(): null | LexicalNode {
    return this.origin.getNextSibling();
  }
  insert(node: LexicalNode): this {
    this.origin.insertAfter(node);
    return this;
  }
}

class BreadthCaretPrevious<T extends LexicalNode> extends AbstractBreadthCaret<
  T,
  'previous'
> {
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
  next: BreadthCaretNext,
  previous: BreadthCaretPrevious,
} as const;

const DEPTH_CTOR = {
  next: DepthCaretFirst,
  previous: DepthCaretLast,
};

/**
 * Get a caret that points at the next or previous sibling of the given origin node.
 *
 * @param origin The origin node
 * @param direction 'next' or 'previous'
 * @returns null if origin is null, otherwise a BreadthCaret for this origin and direction
 */
export function $getBreadthCaret<
  T extends LexicalNode,
  D extends CaretDirection,
>(origin: T, direction: D): BreadthCaret<T, D>;
export function $getBreadthCaret<
  T extends LexicalNode,
  D extends CaretDirection,
>(origin: T | null, direction: D): null | BreadthCaret<T, D>;
export function $getBreadthCaret(
  origin: LexicalNode | null,
  direction: CaretDirection,
): BreadthCaret<LexicalNode, CaretDirection> | null {
  return origin ? new BREADTH_CTOR[direction](origin) : null;
}

function $getLatestTextPointCaret<T extends TextNode, D extends CaretDirection>(
  this: TextPointCaret<T, D>,
): TextPointCaret<T, D> {
  const origin = this.origin.getLatest();
  return origin === this.origin
    ? this
    : $getTextPointCaret(origin, this.direction, this.offset);
}

function $getFlippedTextPointCaret<
  T extends TextNode,
  D extends CaretDirection,
>(this: TextPointCaret<T, D>): TextPointCaret<T, FlipDirection<D>> {
  return $getTextPointCaret(
    this.origin,
    flipDirection(this.direction),
    this.offset,
  );
}

/**
 * Construct a TextPointCaret
 *
 * @param origin The TextNode
 * @param direction The direction (next points to the end of the text, previous points to the beginning)
 * @param offset The offset into the text in absolute positive string coordinates (0 is the start)
 * @returns a TextPointCaret
 */
export function $getTextPointCaret<
  T extends TextNode,
  D extends CaretDirection,
>(
  origin: T,
  direction: D,
  offset: number | CaretDirection,
): TextPointCaret<T, D> {
  return Object.assign($getBreadthCaret(origin, direction), {
    getFlipped: $getFlippedTextPointCaret,
    getLatest: $getLatestTextPointCaret,
    offset: $getTextNodeOffset(origin, offset),
  });
}

/**
 * Get a normalized offset into a TextNode given a numeric offset or a
 * direction for which end of the string to use. Throws if the offset
 * is not in the bounds of the text content size.
 *
 * @param origin a TextNode
 * @param offset An absolute offset into the TextNode string, or a direction for which end to use as the offset
 * @returns An absolute offset into the TextNode string
 */
export function $getTextNodeOffset(
  origin: TextNode,
  offset: number | CaretDirection,
): number {
  const size = origin.getTextContentSize();
  const numericOffset =
    offset === 'next' ? size : offset === 'previous' ? 0 : offset;
  invariant(
    numericOffset >= 0 && numericOffset <= size,
    '$getTextPointCaret: invalid offset %s for size %s',
    String(offset),
    String(size),
  );
  return numericOffset;
}

/**
 * Construct a TextPointCaretSlice given a TextPointCaret and a signed distance. The
 * distance should be negative to slice text before the caret's offset, and positive
 * to slice text after the offset. The direction of the caret itself is not
 * relevant to the string coordinates when working with a TextPointCaretSlice
 * but mutation operations will preserve the direction.
 *
 * @param caret
 * @param distance
 * @returns TextPointCaretSlice
 */
export function $getTextPointCaretSlice<
  T extends TextNode,
  D extends CaretDirection,
>(caret: TextPointCaret<T, D>, distance: number): TextPointCaretSlice<T, D> {
  return {caret, distance};
}

/**
 * Get a caret that points at the first or last child of the given origin node,
 * which must be an ElementNode.
 *
 * @param origin The origin ElementNode
 * @param direction 'next' for first child or 'previous' for last child
 * @returns null if origin is null or not an ElementNode, otherwise a DepthCaret for this origin and direction
 */
export function $getDepthCaret<T extends ElementNode, D extends CaretDirection>(
  origin: T,
  direction: D,
): DepthCaret<T, D>;
export function $getDepthCaret(
  origin: null | LexicalNode,
  direction: CaretDirection,
): null | DepthCaret<ElementNode, CaretDirection> {
  return $isElementNode(origin) ? new DEPTH_CTOR[direction](origin) : null;
}

/**
 * Gets the DepthCaret if one is possible at this caret origin, otherwise return the caret
 */
export function $getChildCaretOrSelf<Caret extends PointCaret | null>(
  caret: Caret,
): PointCaret<NonNullable<Caret>['direction']> | (Caret & null) {
  return (caret && caret.getChildCaret()) || caret;
}

/**
 * Gets the adjacent caret, if not-null and if the origin of the adjacent caret is an ElementNode, then return
 * the DepthCaret. This can be used along with the getParentAdjacentCaret method to perform a full DFS
 * style traversal of the tree.
 *
 * @param caret The caret to start at
 */
export function $getAdjacentDepthCaret<D extends CaretDirection>(
  caret: null | NodeCaret<D>,
): null | NodeCaret<D> {
  return caret && $getChildCaretOrSelf(caret.getAdjacentCaret());
}

class CaretRangeImpl<D extends CaretDirection> implements CaretRange<D> {
  readonly type = 'node-caret-range';
  readonly direction: D;
  anchor: PointCaret<D>;
  focus: PointCaret<D>;
  constructor(anchor: PointCaret<D>, focus: PointCaret<D>, direction: D) {
    this.anchor = anchor;
    this.focus = focus;
    this.direction = direction;
  }
  getLatest(): CaretRange<D> {
    const anchor = this.anchor.getLatest();
    const focus = this.focus.getLatest();
    return anchor === this.anchor && focus === this.focus
      ? this
      : new CaretRangeImpl(anchor, focus, this.direction);
  }
  isCollapsed(): boolean {
    return (
      this.anchor.is(this.focus) &&
      !(
        $isTextPointCaret(this.anchor) &&
        !$isSameTextPointCaret(this.anchor, this.focus)
      )
    );
  }
  getNonEmptyTextSlices(): TextPointCaretSliceTuple<D> {
    return this.getTextSlices().filter(
      (slice) => slice.distance !== 0,
    ) as TextPointCaretSliceTuple<D>;
  }
  getTextSlices(): TextPointCaretSliceTuple<D> {
    const slices = (['anchor', 'focus'] as const).flatMap((k) => {
      const caret = this[k];
      return $isTextPointCaret(caret)
        ? [$getSliceFromTextPointCaret(caret, k)]
        : [];
    });
    if (slices.length === 2) {
      const [{caret: anchorCaret}, {caret: focusCaret}] = slices;
      if (anchorCaret.is(focusCaret)) {
        return [
          $getTextPointCaretSlice(
            anchorCaret,
            focusCaret.offset - anchorCaret.offset,
          ),
        ];
      }
    }
    return slices as TextPointCaretSliceTuple<D>;
  }
  iterNodeCarets(rootMode: RootMode): IterableIterator<NodeCaret<D>> {
    const {anchor, focus} = this;
    const isTextFocus = $isTextPointCaret(focus);
    const step = (state: NodeCaret<D>) =>
      state.is(focus)
        ? null
        : $getAdjacentDepthCaret(state) || state.getParentCaret(rootMode);
    return makeStepwiseIterator({
      initial: anchor.is(focus) ? null : step(anchor),
      map: (state) => state,
      step,
      stop: (state: null | PointCaret<D>): state is null =>
        state === null || (isTextFocus && focus.is(state)),
    });
  }
  [Symbol.iterator](): IterableIterator<NodeCaret<D>> {
    return this.iterNodeCarets('root');
  }
}

function $getSliceFromTextPointCaret<
  T extends TextNode,
  D extends CaretDirection,
>(
  caret: TextPointCaret<T, D>,
  anchorOrFocus: 'anchor' | 'focus',
): TextPointCaretSlice<T, D> {
  const {direction, origin} = caret;
  const offsetB = $getTextNodeOffset(
    origin,
    anchorOrFocus === 'focus' ? flipDirection(direction) : direction,
  );
  return {caret, distance: offsetB - caret.offset};
}

/**
 * Construct a CaretRange from anchor and focus carets pointing in the
 * same direction. In order to get the expected behavior,
 * the anchor must point towards the focus or be the same point.
 *
 * In the 'next' direction the anchor should be at or before the
 * focus in the document. In the 'previous' direction the anchor
 * should be at or after the focus in the document
 * (similar to a backwards RangeSelection).
 *
 * @param anchor
 * @param focus
 * @returns a CaretRange
 */
export function $getCaretRange<D extends CaretDirection>(
  anchor: PointCaret<D>,
  focus: PointCaret<D>,
): CaretRange<D> {
  invariant(
    anchor.direction === focus.direction,
    '$getCaretRange: anchor and focus must be in the same direction',
  );
  return new CaretRangeImpl(anchor, focus, anchor.direction);
}

/**
 * A generalized utility for creating a stepwise iterator
 * based on:
 *
 * - an initial state
 * - a stop guard that returns true if the iteration is over, this
 *   is typically used to detect a sentinel value such as null or
 *   undefined from the state but may return true for other conditions
 *   as well
 * - a step function that advances the state (this will be called
 *   after map each time next() is called to prepare the next state)
 * - a map function that will be called that may transform the state
 *   before returning it. It will only be called once for each next()
 *   call when stop(state) === false
 *
 * @param config
 * @returns An IterableIterator
 */
export function makeStepwiseIterator<State, Stop, Value>(
  config: StepwiseIteratorConfig<State, Stop, Value>,
): IterableIterator<Value> {
  const {initial, stop, step, map} = config;
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
