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

import {$createSlotContainerNode} from '../SlotContainerNode';

// The Card is an ElementNode host that demonstrates the dual capability of
// hosting both a named slot (`title`, exactly one block) and regular
// children (the body, zero or more blocks). The reconciler renders the named
// slot ahead of the children, so the DOM order is `<title>` then the body
// blocks, no React chrome required.
export class CardNode extends ElementNode {
  $config() {
    return this.config('card', {extends: ElementNode});
  }

  createDOM(): HTMLElement {
    const div = document.createElement('div');
    div.className = 'lexical-card-node';
    return div;
  }

  updateDOM(): false {
    return false;
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
  // body is regular children, so it serializes through the normal child path
  // alongside any other ElementNode.
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
      for (const child of slot.getChildren()) {
        $appendNodeToHTML(editor, child, wrapper);
      }
      element.append(wrapper);
    }
    for (const child of this.getChildren()) {
      $appendNodeToHTML(editor, child, element);
    }
    return {element};
  }
}

export function $createCardNode(): CardNode {
  const node = new CardNode();
  $setSlot(
    node,
    'title',
    $createSlotContainerNode().append(
      $createParagraphNode().append($createTextNode('Title')),
    ),
  );
  node.append($createParagraphNode().append($createTextNode('Body')));
  return node;
}

export function $isCardNode(
  node: LexicalNode | null | undefined,
): node is CardNode {
  return node instanceof CardNode;
}
