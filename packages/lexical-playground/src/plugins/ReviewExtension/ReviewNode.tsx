/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  ElementDOMSlot,
  LexicalNode,
  StateConfigValue,
  StateValueOrUpdater,
} from 'lexical';

import {
  $create,
  $createParagraphNode,
  $getState,
  $setSlot,
  $setState,
  createState,
  ElementNode,
  setDOMUnmanaged,
} from 'lexical';

// The star rating (0–5), persisted as NodeState rather than a bespoke
// serialized field, so it rides copy/paste, undo, collab and JSON for free.
// parse() doubles as the default (0) and the clamp for untrusted input.
const ratingState = /* @__PURE__ */ createState('rating', {
  parse: (v): number =>
    typeof v === 'number' && v >= 0 && v <= 5 ? Math.round(v) : 0,
});

// The Review demonstrates an ElementNode whose React presentation goes beyond
// static chrome: an interactive star-rating widget. React owns a stateful
// control (click/hover to set the rating) that writes back to the model via
// NodeState, while the two text channels — the named `author` slot AND the
// linked-list body children (the testimonial prose) — are Lexical-managed
// editable islands the chrome attaches where it wants them. Both text channels
// use the same render-hidden-then-attach technique: the reconciler renders the
// slot container as a hidden placeholder (named-slots default), and createDOM
// applies the identical pattern to the getDOMSlot children element below.
// ReviewExtension's React chrome reveals each region (useLexicalSlotRef for the
// author, the children element by class) and renders the rating stars.
// Contrast with CardNode (in-lexical chrome via getSlotTargetElement, no
// stateful widget) and PullQuoteNode (DecoratorNode host).
export class ReviewNode extends ElementNode {
  $config() {
    return this.config('review', {
      extends: ElementNode,
      slots: ['author'],
      stateConfigs: [{flat: true, stateConfig: ratingState}],
    });
  }

  getRating(): StateConfigValue<typeof ratingState> {
    return $getState(this, ratingState);
  }
  setRating(valueOrUpdater: StateValueOrUpdater<typeof ratingState>): this {
    return $setState(this, ratingState, valueOrUpdater);
  }

  createDOM(): HTMLElement {
    const dom = document.createElement('div');
    dom.className = 'lexical-review-node';
    // The shell is chrome: only the slot containers and the children element
    // flip back to contentEditable=true (the reconciler opts slot containers
    // in automatically when the host DOM is non-editable).
    dom.contentEditable = 'false';
    // Decorator parity for a chrome-owning element: the React portal, the
    // attach/park moves, and the rating widget's clicks all mutate the shell's
    // children from outside the reconciler, so the mutation observer must skip
    // records under it (like it does for DecoratorNode DOM) instead of evicting
    // the chrome and reverting the moves. Selection stays Lexical-managed (no
    // captureSelection): the islands are Lexical content, not a foreign widget.
    setDOMUnmanaged(dom);
    // The children element: same hidden-placeholder technique as named-slot
    // containers, applied to the getDOMSlot channel. The reconciler renders the
    // linked-list children into it synchronously wherever it sits; the React
    // chrome attaches and reveals it.
    const children = document.createElement('div');
    children.className = 'lexical-review-children';
    children.style.display = 'none';
    children.contentEditable = 'true';
    dom.appendChild(children);
    return dom;
  }

  updateDOM(): boolean {
    return false;
  }

  // Linked-list children (the review prose) render into the children element
  // rather than the shell. Resolved by class (not :scope >) so it is still
  // found after the chrome relocates it.
  getDOMSlot(element: HTMLElement): ElementDOMSlot<HTMLElement> {
    const childrenEl = element.querySelector<HTMLElement>(
      '.lexical-review-children',
    );
    const domSlot = super.getDOMSlot(element);
    return childrenEl !== null ? domSlot.withElement(childrenEl) : domSlot;
  }

  // Block-level inserts land in the body channel instead of splitting the
  // Review (mirrors CardNode).
  isShadowRoot(): true {
    return true;
  }
}

export function $createReviewNode(): ReviewNode {
  const node = $create(ReviewNode);
  // Seed empty fields; the author hint and prose hint are CSS placeholders, so
  // the model carries no placeholder TextNodes.
  $setSlot(node, 'author', $createParagraphNode());
  node.append($createParagraphNode());
  return node;
}

export function $isReviewNode(
  node: LexicalNode | null | undefined,
): node is ReviewNode {
  return node instanceof ReviewNode;
}
