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
  NodeStateVersion,
  SlotChildNode,
  StateValueOrUpdater,
} from 'lexical';
import type {JSX} from 'react';

import {$appendNodeToHTML} from '@lexical/html';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useLexicalSlotRef} from '@lexical/react/useLexicalSlotRef';
import {
  $create,
  $createParagraphNode,
  $createTextNode,
  $fullReconcile,
  $getSlot,
  $getSlotNames,
  $getState,
  $setSlot,
  $setState,
  createState,
  DecoratorNode,
  NODE_STATE_DIRECT,
} from 'lexical';

import {$createSlotContainerNode} from '../../nodes/SlotContainerNode';

// A per-PullQuote override for whether its `quote` slot is editable, persisted
// as NodeState so it rides undo/redo, copy/paste and collab like any other model
// state. Tri-state: `null` follows the editor, `true` pins the quote editable
// even in a read-only editor, `false` locks it even in an editable one. The
// PullQuote `$getSlotEditable` render override reads it; a change re-renders the
// quote subtree via `$fullReconcile(node)` so the new value (and its cascade
// into any slots nested in the quote) reaches the DOM.
const quoteEditableState = /* @__PURE__ */ createState('quoteEditable', {
  parse: (v): boolean | null => (typeof v === 'boolean' ? v : null),
});

// Cycle the tri-state: null -> true -> false -> null.
function nextQuoteEditable(value: boolean | null): boolean | null {
  return value === null ? true : value === true ? false : null;
}

function quoteEditableLabel(value: boolean | null): string {
  return value === null
    ? 'Quote: follows editor'
    : value
      ? 'Quote: always editable'
      : 'Quote: locked';
}

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
function PullQuoteComponent({
  node,
  nodeKey,
}: {
  node: PullQuoteNode;
  nodeKey: NodeKey;
}): JSX.Element {
  const [editor] = useLexicalComposerContext();
  const quoteRef = useLexicalSlotRef<HTMLDivElement>(editor, nodeKey, 'quote');
  const attributionRef = useLexicalSlotRef<HTMLDivElement>(
    editor,
    nodeKey,
    'attribution',
  );
  // Mirror the quote-editable override into React so the toggle reflects undo,
  // collab and copy/paste, not just local clicks.
  const quoteEditable = node.getQuoteEditable(NODE_STATE_DIRECT);
  const cycleQuoteEditable = () =>
    editor.update(() => {
      node.setQuoteEditable(nextQuoteEditable);
      // Re-render the quote and everything beneath it so the new editable
      // value — and its cascade into any slots nested in the quote — reaches
      // the DOM, without a document mutation observed on those descendants.
      $fullReconcile(node);
    });
  return (
    <div className="lexical-pullquote-chrome">
      <button
        type="button"
        className="lexical-pullquote-editable-toggle"
        data-host-control=""
        data-quote-editable={String(quoteEditable)}
        contentEditable={false}
        onMouseDown={e => e.preventDefault()}
        onClick={cycleQuoteEditable}>
        {quoteEditableLabel(quoteEditable)}
      </button>
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

  // The quote-slot editable override (null follows the editor, true/false pin
  // it). Stored as NodeState; see `quoteEditableState`.
  getQuoteEditable(version?: NodeStateVersion): boolean | null {
    return $getState(this, quoteEditableState, version);
  }
  setQuoteEditable(
    valueOrUpdater: StateValueOrUpdater<typeof quoteEditableState>,
  ): this {
    return $setState(this, quoteEditableState, valueOrUpdater);
  }

  decorate(): JSX.Element {
    return <PullQuoteComponent node={this} nodeKey={this.__key} />;
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
