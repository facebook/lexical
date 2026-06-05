/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalNode} from 'lexical';

import {$createParagraphNode, $createTextNode, ElementNode} from 'lexical';

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
