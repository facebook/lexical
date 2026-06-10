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

// PullQuote is a DecoratorNode-as-host with two editable shadow-root slots:
// `quote` carries the inline-formatted body of the quote and `attribution`
// carries the source / author line. Both slots are SlotContainerNodes, so
// every extension registered on the host editor (RichText, Format, Link,
// Mentions, etc.) applies inside them — exactly the framework alternative
// to nested editors that #6613 / #5981 asked for. The host owns no children
// channel, so neither slot can leak into a stray paragraph and the box is
// an atomic block from the user's perspective.
function PullQuoteComponent({nodeKey}: {nodeKey: NodeKey}): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const quoteRef = useLexicalSlot<HTMLDivElement>(editor, nodeKey, 'quote');
  const attributionRef = useLexicalSlot<HTMLDivElement>(
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
    return this.config('pullquote', {extends: DecoratorNode});
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
  // `blockquote`). External paste that strips the outer host wrapper is
  // reassembled by `$rewrapOrphanedSlotWrappers` on the way in.
  exportDOM(editor: LexicalEditor): DOMExportOutput {
    const host = document.createElement('div');
    host.className = 'lexical-pullquote-node';
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
      host.append(wrapper);
    }
    return {element: host};
  }
}

export function $createPullQuoteNode(): PullQuoteNode {
  const node = new PullQuoteNode();
  $setSlot(
    node,
    'quote',
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
    $createSlotContainerNode().append(
      $createParagraphNode().append($createTextNode('Arthur C. Clarke')),
    ),
  );
  return node;
}

export function $isPullQuoteNode(
  node: LexicalNode | null | undefined,
): node is PullQuoteNode {
  return node instanceof PullQuoteNode;
}
