/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {JSX} from 'react';

import {$appendNodeToHTML} from '@lexical/html';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useLexicalSlotRef} from '@lexical/react/useLexicalSlotRef';
import {
  $create,
  $createParagraphNode,
  $createTextNode,
  $getSlot,
  $getSlotNames,
  $setSlot,
  DecoratorNode,
  type DOMExportOutput,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey,
  type SlotChildNode,
} from 'lexical';

import {$createSlotContainerNode} from '../../nodes/SlotContainerNode';

// PullQuote is a DecoratorNode-as-host with two editable slots: `quote`
// carries the inline-formatted body of the quote and `attribution` carries
// the source / author line. The quote is legitimately multi-block, so it is
// a SlotContainerNode; the attribution is a single-line field, so its value
// is a bare ParagraphNode — the slot link itself is the virtual shadow root,
// no container wrapper needed. Every extension registered on the host editor
// (RichText, Format, Link, Mentions, etc.) applies inside both — exactly the
// framework alternative to nested editors that #6613 / #5981 asked for. The
// host owns no children channel, so neither slot can leak into a stray
// paragraph and the box is an atomic block from the user's perspective.
function PullQuoteComponent({nodeKey}: {nodeKey: NodeKey}): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const quoteRef = useLexicalSlotRef<HTMLDivElement>(editor, nodeKey, 'quote');
  const attributionRef = useLexicalSlotRef<HTMLDivElement>(
    editor,
    nodeKey,
    'attribution',
  );
  return (
    <div className="lexical-pullquote-chrome">
      <div ref={quoteRef} className="lexical-pullquote-body" />
      <div ref={attributionRef} className="lexical-pullquote-attribution" />
    </div>
  );
}

export class PullQuoteNode extends DecoratorNode<JSX.Element> {
  $config() {
    return this.config('pullquote', {
      extends: DecoratorNode,
      // Canonical order: code-unit order would put attribution before quote.
      slots: ['quote', 'attribution'],
    });
  }

  createDOM(): HTMLElement {
    const div = document.createElement('div');
    div.className = 'lexical-pullquote-node';
    return div;
  }

  updateDOM(): false {
    return false;
  }

  isInline(): false {
    return false;
  }

  decorate(): JSX.Element {
    return <PullQuoteComponent nodeKey={this.__key} />;
  }

  // Emit both slots inside a `<div class="lexical-pullquote-node">` host
  // wrapper carrying our sentinel class — the import rule keys off that
  // class, which keeps the round-trip independent of lexical-rich-text's
  // `<blockquote>` importer (QuoteNode's importDOM also matches
  // `blockquote`).
  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const host = document.createElement('div');
    host.className = 'lexical-pullquote-node';
    for (const name of $getSlotNames(this)) {
      const slot = $getSlot(this, name);
      if (slot) {
        const wrapper = document.createElement('div');
        wrapper.setAttribute('data-lexical-slot', name);
        $appendNodeToHTML(editor, slot, wrapper);
        host.append(wrapper);
      }
    }
    return {element: host};
  }
}

export function $createPullQuoteNode(
  quote?: LexicalNode & SlotChildNode,
  attribution?: LexicalNode & SlotChildNode,
): PullQuoteNode {
  const node = $create(PullQuoteNode);
  $setSlot(
    node,
    'quote',
    quote ||
      $createSlotContainerNode().append(
        $createParagraphNode().append(
          $createTextNode(
            'The only way to discover the limits of the possible is to go beyond them into the impossible.',
          ),
        ),
      ),
  );
  $setSlot(
    node,
    'attribution',
    attribution ||
      $createParagraphNode().append($createTextNode('Arthur C. Clarke')),
  );
  return node;
}

export function $isPullQuoteNode(
  node: LexicalNode | null | undefined,
): node is PullQuoteNode {
  return node instanceof PullQuoteNode;
}
