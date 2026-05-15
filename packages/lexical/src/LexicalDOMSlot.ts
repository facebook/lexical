/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import invariant from 'shared/invariant';

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
    invariant(
      this.before === null || this.before.parentElement === this.element,
      'DOMSlot.insertChild: before is not in element',
    );
    this.element.insertBefore(dom, this.before);
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
    const firstChild = this.after
      ? this.after.nextSibling
      : this.element.firstChild;
    return firstChild === this.before ? null : firstChild;
  }
}
