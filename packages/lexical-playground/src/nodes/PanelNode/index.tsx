/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {ElementDOMSlot, LexicalNode} from 'lexical';

import {
  $create,
  $createParagraphNode,
  $createTextNode,
  $setSlot,
  ElementNode,
  setDOMUnmanaged,
} from 'lexical';

// The Panel demonstrates an ElementNode whose presentation is implemented in
// React: the host shell is contentEditable=false chrome, while both content
// channels — the named `title` slot AND the linked-list body children — are
// Lexical-managed editable islands that the chrome attaches where it wants
// them. Both channels use the same render-hidden-then-attach technique: the
// reconciler renders the slot container as a hidden placeholder (named-slots
// default), and createDOM applies the identical pattern to the getDOMSlot
// children element below. PanelExtension's React chrome reveals each region
// (useLexicalSlot for the title, the children element by class). Contrast
// with CardNode (in-lexical chrome via getSlotTargetElement) and
// PullQuoteNode (DecoratorNode host).
export class PanelNode extends ElementNode {
  $config() {
    return this.config('panel', {extends: ElementNode, slots: ['title']});
  }

  createDOM(): HTMLElement {
    const dom = document.createElement('div');
    dom.className = 'lexical-panel-node';
    // The shell is chrome: only the slot containers and the children element
    // flip back to contentEditable=true (the reconciler opts slot containers
    // in automatically when the host DOM is non-editable).
    dom.contentEditable = 'false';
    // Decorator parity for a chrome-owning element: the React portal and the
    // attach/park moves all mutate the shell's children from outside the
    // reconciler, so the mutation observer must skip records under it (like
    // it does for DecoratorNode DOM) instead of evicting the chrome and
    // reverting the moves. Selection stays Lexical-managed (no
    // captureSelection): the islands are Lexical content, not a foreign
    // widget.
    setDOMUnmanaged(dom);
    // The children element: same hidden-placeholder technique as named-slot
    // containers, applied to the getDOMSlot channel. The reconciler renders
    // the linked-list children into it synchronously wherever it sits; the
    // React chrome attaches and reveals it.
    const children = document.createElement('div');
    children.className = 'lexical-panel-children';
    children.style.display = 'none';
    children.contentEditable = 'true';
    dom.appendChild(children);
    return dom;
  }

  updateDOM(): boolean {
    return false;
  }

  // Linked-list children render into the children element rather than the
  // shell — the existing element-level control this node's named slot
  // handling mirrors. Resolved by class (not :scope >) so it is still found
  // after the chrome relocates it.
  getDOMSlot(element: HTMLElement): ElementDOMSlot<HTMLElement> {
    const childrenEl = element.querySelector<HTMLElement>(
      '.lexical-panel-children',
    );
    const domSlot = super.getDOMSlot(element);
    return childrenEl !== null ? domSlot.withElement(childrenEl) : domSlot;
  }

  // Block-level inserts land in the body channel instead of splitting the
  // Panel (mirrors CardNode).
  isShadowRoot(): true {
    return true;
  }
}

export function $createPanelNode(): PanelNode {
  const node = $create(PanelNode);
  $setSlot(
    node,
    'title',
    $createParagraphNode().append($createTextNode('Panel Title')),
  );
  node.append($createParagraphNode().append($createTextNode('Panel body')));
  return node;
}

export function $isPanelNode(
  node: LexicalNode | null | undefined,
): node is PanelNode {
  return node instanceof PanelNode;
}
