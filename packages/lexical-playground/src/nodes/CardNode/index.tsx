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
  $isElementNode,
  ElementNode,
} from 'lexical';

import {$createSlotContainerNode} from '../SlotContainerNode';

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

  // Slots ride in a separate Map, so the HTML exporter never descends into
  // them on its own — like NodeState, slot serialization is opt-in. Emit each
  // slot's contents into a `data-lexical-slot` wrapper the import rule maps
  // back to setSlot(). JSON still serializes slots automatically.
  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const element = document.createElement('div');
    element.className = 'lexical-card-node';
    for (const name of this.getSlotNames()) {
      const slot = this.getSlot(name);
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
    return {element};
  }
}

export function $createCardNode(): CardNode {
  const node = new CardNode();
  node.setSlot(
    'title',
    $createSlotContainerNode().append(
      $createParagraphNode().append($createTextNode('Title')),
    ),
  );
  node.setSlot(
    'body',
    $createSlotContainerNode().append(
      $createParagraphNode().append($createTextNode('Body')),
    ),
  );
  return node;
}

export function $isCardNode(
  node: LexicalNode | null | undefined,
): node is CardNode {
  return node instanceof CardNode;
}
