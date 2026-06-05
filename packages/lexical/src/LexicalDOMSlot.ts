/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalPrivateDOM} from './LexicalNode';
import type {ElementNode} from './nodes/LexicalElementNode';

import invariant from '@lexical/internal/invariant';

import {IS_APPLE_WEBKIT, IS_IOS, IS_SAFARI} from './environment';
import {$getEditor} from './LexicalUtils';

/**
 * The editor has at most one block cursor element
 * ({@link LexicalEditor._blockCursorElement}) — a transient, non-lexical
 * element the selection layer inserts among an ElementNode's children when a
 * collapsed element selection is adjacent to a node that can't host the caret
 * (a block decorator, or a non-empty-capable block). Slots must skip it so it
 * is never mistaken for managed content. There is only ever one, read from the
 * active editor.
 */
function $getActiveBlockCursorElement(): HTMLElement | null {
  return $getEditor()._blockCursorElement;
}

/**
 * A slot value renders slots-first into its own `[data-lexical-slot]`
 * container, prepended ahead of the host's linked-list children. The leading
 * boundary skips these so they are never counted as managed children.
 */
function isSlotContainerDOM(node: Node | null): node is Element {
  return (
    node !== null &&
    node.nodeType === 1 &&
    (node as Element).hasAttribute('data-lexical-slot')
  );
}

/**
 * Base class for DOM slots — a pointer to the content-bearing element of a
 * node's DOM, plus optional `before` / `after` boundaries marking where the
 * lexical-managed content sits inside that element.
 *
 * For ElementNode children management see {@link ElementDOMSlot}. For
 * non-Element nodes (TextNode, LineBreakNode, DecoratorNode) the slot still
 * supports an internal `before` / `after` so subclasses can prepend or
 * append non-lexical siblings around the content node and the reconciler /
 * `setTextContent` route the actual content through the slot.
 *
 * @experimental
 */
export class DOMSlot<T extends HTMLElement = HTMLElement> {
  /** The content-bearing element of the node's DOM. */
  readonly element: T;
  /** Upper boundary: the lexical-managed range ends before this node. */
  readonly before: Node | null;
  /** Lower boundary: the lexical-managed range starts after this node. */
  readonly after: Node | null;
  constructor(
    element: T,
    before?: Node | undefined | null,
    after?: Node | undefined | null,
  ) {
    this.element = element;
    this.before = before || null;
    this.after = after || null;
  }
  /** Return a new slot with `before` updated. */
  withBefore(before: Node | undefined | null): DOMSlot<T> {
    return new DOMSlot(this.element, before, this.after);
  }
  /** Return a new slot with `after` updated. */
  withAfter(after: Node | undefined | null): DOMSlot<T> {
    return new DOMSlot(this.element, this.before, after);
  }
  /** Return a new slot with `element` updated. */
  withElement<ElementType extends HTMLElement>(
    element: ElementType,
  ): DOMSlot<ElementType> {
    if ((this.element as HTMLElement) === element) {
      return this as unknown as DOMSlot<ElementType>;
    }
    return new DOMSlot(element, this.before, this.after);
  }
  /**
   * Insert the given node before `this.before` (if defined) or append it to
   * `this.element` otherwise. Subclasses may override to respect additional
   * boundaries (e.g. `ElementDOMSlot` also keeps the managed line break at
   * the end).
   */
  insertChild(dom: Node): this {
    const before = this.getInsertionAnchor();
    invariant(
      before === null || before.parentElement === this.element,
      'DOMSlot.insertChild: before is not in element',
    );
    this.element.insertBefore(dom, before);
    return this;
  }
  /**
   * Remove the given child from `this.element`. Throws if it was not a child.
   */
  removeChild(dom: Node): this {
    invariant(
      dom.parentElement === this.element,
      'DOMSlot.removeChild: dom is not in element',
    );
    this.element.removeChild(dom);
    return this;
  }
  /**
   * Replace `prevDom` with `dom`. Throws if `prevDom` is not a child.
   */
  replaceChild(dom: Node, prevDom: Node): this {
    invariant(
      prevDom.parentElement === this.element,
      'DOMSlot.replaceChild: prevDom is not in element',
    );
    this.element.replaceChild(dom, prevDom);
    return this;
  }
  /**
   * Returns the first managed child (the first node in
   * `this.element` that is not a non-lexical prelude / decoration), or
   * `null` if there is none. Subclasses may override to also skip
   * reconciler-managed scaffolding such as the managed line break.
   */
  getFirstChild(): ChildNode | null {
    const anchor = this.getFirstChildAnchor();
    const firstChild = anchor ? anchor.nextSibling : this.element.firstChild;
    return firstChild === this.getInsertionAnchor() ? null : firstChild;
  }
  /**
   * @internal
   *
   * The leading-boundary counterpart to {@link getInsertionAnchor}: the node
   * the lexical-managed range starts immediately after (its `nextSibling` is
   * the first managed child), or `null` when managed children begin at
   * `this.element.firstChild`. The base slot uses `this.after`; subclasses
   * extend it to skip leading non-lexical scaffolding (e.g. the block cursor).
   */
  getFirstChildAnchor(): Node | null {
    return this.after;
  }
  /**
   * Map a DOM selection point landing at or inside `leafDOM` (the node's
   * keyed DOM) to whether the caret is positioned BEFORE or AFTER the
   * node in document order. The default implementation derives the
   * boundary from `this.element`'s index inside `leafDOM`:
   *
   * - When `this.element === leafDOM` (no wrap exposed an inner content
   *   element via `withElement`): only a DOM caret directly on
   *   `leafDOM` at offset 0 counts as "before". Matches the historical
   *   decorator rule.
   * - When `this.element !== leafDOM` (wrap pattern that exposed the
   *   inner content element via `withElement`, e.g. a `<br>` inside a
   *   decoration `<span>`): caret positions at or before the content
   *   element are "before", later positions are "after". Handles
   *   nested wraps by walking each side up to its top-level child of
   *   `leafDOM`.
   *
   * Symmetric with {@link ElementDOMSlot.resolveChildIndex}, which
   * performs the analogous mapping for ElementNode children. Together
   * they let the slot abstraction own all DOM-offset to lexical-offset
   * translation.
   *
   * @internal
   */
  resolveLeafPosition(
    leafDOM: HTMLElement,
    initialDOM: Node,
    initialOffset: number,
  ): 'before' | 'after' {
    if (this.element === leafDOM) {
      return initialDOM === leafDOM && initialOffset === 0 ? 'before' : 'after';
    }
    const innerChild = $topLevelChildOf(leafDOM, this.element);
    if (innerChild === null) {
      return 'after';
    }
    const innerIndex = Array.prototype.indexOf.call(
      leafDOM.childNodes,
      innerChild,
    );
    if (innerIndex < 0) {
      return 'after';
    }
    if (initialDOM === leafDOM) {
      return initialOffset <= innerIndex ? 'before' : 'after';
    }
    const initialChild = $topLevelChildOf(leafDOM, initialDOM);
    if (initialChild === null) {
      return 'after';
    }
    const childIndex = Array.prototype.indexOf.call(
      leafDOM.childNodes,
      initialChild,
    );
    return childIndex >= 0 && childIndex <= innerIndex ? 'before' : 'after';
  }

  /**
   * @internal
   *
   * The node managed children are inserted before, or `null` to append.
   * Subclasses widen this to reserve trailing scaffolding (e.g.
   * {@link ElementDOMSlot} keeps the managed line break last).
   */
  getInsertionAnchor(): Node | null {
    return this.before;
  }
}

function $topLevelChildOf(parent: HTMLElement, descendant: Node): Node | null {
  let node: Node | null = descendant;
  while (node !== null && node.parentNode !== parent) {
    node = node.parentNode;
  }
  return node;
}

/**
 * A utility class for managing the DOM children of an ElementNode.
 *
 * Extends {@link DOMSlot} with ElementNode-specific scaffolding — the
 * reconciler-managed line break that keeps empty elements selectable, and
 * the offset / index resolution helpers needed when mapping DOM selections
 * onto lexical positions. The base `before` / `after` boundaries and the
 * children mutation helpers (`insertChild`, `removeChild`, …) live on
 * {@link DOMSlot}.
 */
export class ElementDOMSlot<
  T extends HTMLElement = HTMLElement,
> extends DOMSlot<T> {
  /** Return a new slot with `before` updated, preserving subclass type. */
  withBefore(before: Node | undefined | null): ElementDOMSlot<T> {
    return new ElementDOMSlot(this.element, before, this.after);
  }
  /** Return a new slot with `after` updated, preserving subclass type. */
  withAfter(after: Node | undefined | null): ElementDOMSlot<T> {
    return new ElementDOMSlot(this.element, this.before, after);
  }
  /** Return a new slot with `element` updated, preserving subclass type. */
  withElement<ElementType extends HTMLElement>(
    element: ElementType,
  ): ElementDOMSlot<ElementType> {
    if (this.element === (element as HTMLElement)) {
      return this as unknown as ElementDOMSlot<ElementType>;
    }
    return new ElementDOMSlot(element, this.before, this.after);
  }
  /**
   * @internal
   */
  override getInsertionAnchor(): Node | null {
    return super.getInsertionAnchor() || this.getManagedLineBreak();
  }
  /**
   * @internal
   *
   * Extends the leading boundary to skip the editor's transient block cursor
   * when it sits at the head of the managed range (a collapsed element
   * selection at offset 0), mirroring how {@link getInsertionAnchor} extends
   * the trailing boundary past the managed line break. Only ElementNodes host
   * a block cursor among their children, so the base slot stays editor-free.
   */
  override getFirstChildAnchor(): Node | null {
    let anchor = super.getFirstChildAnchor();
    // Advance past the prepended slot containers (a separate channel, not
    // managed children) so the first slot is never mistaken for the first
    // child — which would shift every child DOM index by the slot count.
    let node = anchor ? anchor.nextSibling : this.element.firstChild;
    while (isSlotContainerDOM(node)) {
      anchor = node;
      node = node.nextSibling;
    }
    const firstChild = anchor ? anchor.nextSibling : this.element.firstChild;
    return firstChild !== null && firstChild === $getActiveBlockCursorElement()
      ? firstChild
      : anchor;
  }
  /**
   * @internal
   */
  getManagedLineBreak(): Exclude<
    LexicalPrivateDOM['__lexicalLineBreak'],
    undefined
  > {
    const element: HTMLElement & LexicalPrivateDOM = this.element;
    return element.__lexicalLineBreak || null;
  }
  /** @internal */
  setManagedLineBreak(
    lineBreakType: null | 'empty' | 'line-break' | 'decorator',
  ): void {
    const element: HTMLElement & LexicalPrivateDOM = this.element;
    element.__lexicalLastChildKind = lineBreakType;
    if (lineBreakType === null) {
      this.removeManagedLineBreak();
    } else {
      const webkitHack =
        lineBreakType === 'decorator' &&
        (IS_APPLE_WEBKIT || IS_IOS || IS_SAFARI);
      this.insertManagedLineBreak(webkitHack);
    }
  }

  /** @internal */
  removeManagedLineBreak(): void {
    const br = this.getManagedLineBreak();
    if (br) {
      const element: HTMLElement & LexicalPrivateDOM = this.element;
      const sibling = br.nodeName === 'IMG' ? br.nextSibling : null;
      if (sibling) {
        element.removeChild(sibling);
      }
      element.removeChild(br);
      element.__lexicalLineBreak = undefined;
    }
  }
  /** @internal */
  insertManagedLineBreak(webkitHack: boolean): void {
    const prevBreak = this.getManagedLineBreak();
    if (prevBreak) {
      if (webkitHack === (prevBreak.nodeName === 'IMG')) {
        return;
      }
      this.removeManagedLineBreak();
    }
    const element: HTMLElement & LexicalPrivateDOM = this.element;
    const before = this.before;
    const br = document.createElement('br');
    element.insertBefore(br, before);
    if (webkitHack) {
      const img = document.createElement('img');
      img.setAttribute('data-lexical-linebreak', 'true');
      img.style.setProperty('display', 'inline', 'important');
      img.style.setProperty('border', '0px', 'important');
      img.style.setProperty('margin', '0px', 'important');
      img.alt = '';
      element.insertBefore(img, br);
      element.__lexicalLineBreak = img;
    } else {
      element.__lexicalLineBreak = br;
    }
  }

  /**
   * @internal
   *
   * The DOM child index at which the first managed child appears — i.e. the
   * count of leading non-lexical nodes (the `this.after` region, plus the
   * block cursor when it sits at the head). Walks forward from the start,
   * stopping at the first managed child, or at the trailing boundary
   * (`this.before` / the managed line break via {@link getInsertionAnchor})
   * when there are no managed children.
   */
  getFirstChildOffset(): number {
    const firstChild = this.getFirstChild();
    const insertionAnchor = this.getInsertionAnchor();
    let i = 0;
    for (
      let node = this.element.firstChild;
      node !== null && node !== firstChild && node !== insertionAnchor;
      node = node.nextSibling
    ) {
      i++;
    }
    return i;
  }

  /**
   * @internal
   */
  resolveChildIndex(
    element: ElementNode,
    elementDOM: HTMLElement,
    initialDOM: Node,
    initialOffset: number,
  ): [node: ElementNode, idx: number] {
    if (initialDOM === this.element) {
      // Map a raw DOM child index (`initialOffset`) to a lexical child index by
      // counting the managed children in DOM positions
      // `[firstChildOffset, initialOffset)`, skipping the editor's block cursor
      // when it is interleaved between two block children (it occupies a DOM
      // slot but is not a lexical child). `firstChildOffset` already accounts
      // for leading scaffolding (the `this.after` region and a head cursor);
      // the clamp keeps the result within the element's lexical range.
      const firstChildOffset = this.getFirstChildOffset();
      const blockCursor = $getActiveBlockCursorElement();
      const childNodes = this.element.childNodes;
      const limit = Math.min(initialOffset, childNodes.length);
      let idx = 0;
      for (let i = firstChildOffset; i < limit; i++) {
        if (childNodes[i] !== blockCursor) {
          idx++;
        }
      }
      return [element, Math.min(idx, element.getChildrenSize())];
    }
    // The resolved offset must be before or after the children
    const initialPath = indexPath(elementDOM, initialDOM);
    initialPath.push(initialOffset);
    const elementPath = indexPath(elementDOM, this.element);
    let offset = element.getIndexWithinParent();
    for (let i = 0; i < elementPath.length; i++) {
      const target = initialPath[i];
      const source = elementPath[i];
      if (target === undefined || target < source) {
        break;
      } else if (target > source) {
        offset += 1;
        break;
      }
    }
    return [element.getParentOrThrow(), offset];
  }
}

export function indexPath(root: HTMLElement, child: Node): number[] {
  const path: number[] = [];
  let node: Node | null = child;
  for (; node !== root && node !== null; node = node.parentNode) {
    let i = 0;
    for (
      let sibling = node.previousSibling;
      sibling !== null;
      sibling = sibling.previousSibling
    ) {
      i++;
    }
    path.push(i);
  }
  invariant(node === root, 'indexPath: root is not a parent of child');
  return path.reverse();
}
