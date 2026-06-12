/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {DOMExportOutput, LexicalEditor, LexicalNode} from 'lexical';

import {$appendNodeToHTML} from '@lexical/html';
import {
  $createParagraphNode,
  $createTextNode,
  $getSlot,
  $getSlotNames,
  $isElementNode,
  $setSlot,
  ElementNode,
} from 'lexical';

import {$isSlotContainerNode} from '../SlotContainerNode';

// The Card is an ElementNode host that demonstrates the dual capability of
// hosting both a named slot (`title`, exactly one block) and regular
// children (the body, zero or more blocks). The reconciler renders the named
// slot ahead of the children, so the DOM order is `<title>` then the body
// blocks, no React chrome required. The title is a single-line field, so its
// slot value is a bare ParagraphNode — the slot link itself is the virtual
// shadow root, no container wrapper needed; Enter inside it is a core no-op
// and multi-block paste flattens to inline content like an <input>.
export class CardNode extends ElementNode {
  $config() {
    return this.config('card', {extends: ElementNode, slots: ['title']});
  }

  createDOM(): HTMLElement {
    const div = document.createElement('div');
    div.className = 'lexical-card-node';
    return div;
  }

  updateDOM(): false {
    return false;
  }

  // The Card is a shadow-root container so block-level inserts driven by
  // `$insertNodeToNearestRoot` (e.g. INSERT_TABLE_COMMAND, the Markdown
  // shortcut paragraph→heading transform) land inside the body channel
  // instead of splitting the Card and dropping the new block at the
  // document root. SELECT_ALL inside the title slot still scopes to the
  // (inner) slot value since its slot link is a virtual shadow root and
  // resolution picks the innermost boundary.
  isShadowRoot(): true {
    return true;
  }

  // When the Card is the only thing in a NodeSelection (the atomic chrome
  // click promotes a click into one), the body children would otherwise be
  // dropped on clipboard copy / HTML export because none of them are in the
  // selection themselves. Opting in to `includeChildrenWhenSelected` pulls
  // them in, mirroring how the Card reads to the user — clicking the chrome
  // selects "the whole Card", not "the Card minus its body".
  includeChildrenWhenSelected(): boolean {
    return true;
  }

  // Slots ride in a separate Map, so the HTML exporter never descends into
  // them on its own — like NodeState, slot serialization is opt-in. Emit the
  // named title slot into a `data-lexical-slot` wrapper that the
  // PlaygroundImportExtension's CardImportRule maps back to setSlot(); the
  // body is regular children and serializes through the normal child path
  // (the outer $appendNodesToHTML loop recurses into `target.getChildren()`
  // when no `$getChildNodes` override is supplied).
  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const element = document.createElement('div');
    element.className = 'lexical-card-node';
    for (const name of $getSlotNames(this)) {
      const slot = $getSlot(this, name);
      if (!$isElementNode(slot)) {
        continue;
      }
      const wrapper = document.createElement('div');
      wrapper.setAttribute('data-lexical-slot', name);
      if ($isSlotContainerNode(slot)) {
        // A multi-block container is transparent in HTML: its blocks export
        // directly into the wrapper (the container is a model-side scoping
        // artifact, not content).
        for (const child of slot.getChildren()) {
          $appendNodeToHTML(editor, child, wrapper);
        }
      } else {
        // A bare block value IS the slotted element: it exports itself, so
        // the wrapper holds e.g. a single `<p>` directly.
        $appendNodeToHTML(editor, slot, wrapper);
      }
      element.append(wrapper);
    }
    return {element};
  }
}

export function $createCardNode(): CardNode {
  const node = new CardNode();
  $setSlot(
    node,
    'title',
    $createParagraphNode().append($createTextNode('Title')),
  );
  node.append($createParagraphNode().append($createTextNode('Body')));
  return node;
}

export function $isCardNode(
  node: LexicalNode | null | undefined,
): node is CardNode {
  return node instanceof CardNode;
}
