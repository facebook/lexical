/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  DOMExportOutput,
  LexicalEditor,
  LexicalNode,
  NodeKey,
} from 'lexical';
import type {JSX} from 'react';

import {$appendNodeToHTML} from '@lexical/html';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useLexicalSlot} from '@lexical/react/useLexicalSlot';
import {
  $createParagraphNode,
  $createTextNode,
  $getSlot,
  $getSlotNames,
  $isElementNode,
  $setSlot,
  DecoratorNode,
} from 'lexical';
import * as React from 'react';

import {$createSlotContainerNode} from '../SlotContainerNode';

// The Card is a DecoratorNode host: its slot containers are reconciled
// detached (the reconciler owns no inline layout for a decorator host) and
// useLexicalSlot moves each one into the React-rendered chrome below.
function CardComponent({nodeKey}: {nodeKey: NodeKey}): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const titleRef = useLexicalSlot<HTMLDivElement>(editor, nodeKey, 'title');
  const bodyRef = useLexicalSlot<HTMLDivElement>(editor, nodeKey, 'body');
  return (
    <div className="lexical-card-chrome">
      <div ref={titleRef} />
      <div ref={bodyRef} />
    </div>
  );
}

export class CardNode extends DecoratorNode<JSX.Element> {
  $config() {
    return this.config('card', {extends: DecoratorNode});
  }

  createDOM(): HTMLElement {
    const div = document.createElement('div');
    div.className = 'lexical-card-node';
    return div;
  }

  updateDOM(): false {
    return false;
  }

  isInline(): false {
    return false;
  }

  decorate(): JSX.Element {
    return <CardComponent nodeKey={this.__key} />;
  }

  // Slots ride in a separate Map, so the HTML exporter never descends into
  // them on its own — like NodeState, slot serialization is opt-in. Emit each
  // slot's contents into a `data-lexical-slot` wrapper the import rule maps
  // back to setSlot(). JSON still serializes slots automatically.
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
  $setSlot(
    node,
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
