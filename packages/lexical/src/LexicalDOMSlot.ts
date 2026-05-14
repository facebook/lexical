/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Base class for DOM slots — a pointer to the content-bearing element of a
 * node's DOM. Subclasses (notably {@link ElementDOMSlot}) extend this with
 * children-management semantics for ElementNode.
 *
 * For non-Element nodes (TextNode, LineBreakNode, DecoratorNode), the slot
 * points at the node's keyed DOM by default. Subclasses may override
 * {@link LexicalNode.getDOMSlot} to return a slot pointing at an inner
 * content-bearing element when wrapping is desired.
 *
 * @experimental
 */
export class DOMSlot<T extends HTMLElement = HTMLElement> {
  /** The content-bearing element of the node's DOM. */
  readonly element: T;
  constructor(element: T) {
    this.element = element;
  }
  /**
   * Return a new DOMSlot with an updated root element.
   */
  withElement<ElementType extends HTMLElement>(
    element: ElementType,
  ): DOMSlot<ElementType> {
    if ((this.element as HTMLElement) === element) {
      return this as unknown as DOMSlot<ElementType>;
    }
    return new DOMSlot(element);
  }
}
