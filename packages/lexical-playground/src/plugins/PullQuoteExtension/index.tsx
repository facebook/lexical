/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalCommand, LexicalNode} from 'lexical';

import {NodeSelectionDataSelectedExtension} from '@lexical/extension';
import {
  CoreImportExtension,
  defineImportRule,
  DOMImportExtension,
  sel,
} from '@lexical/html';
import {$insertNodeToNearestRoot, mergeRegister} from '@lexical/utils';
import {
  $createParagraphNode,
  $getSlot,
  $isElementNode,
  $removeSlot,
  $setSlot,
  COMMAND_PRIORITY_EDITOR,
  configExtension,
  createCommand,
  defineExtension,
} from 'lexical';

import {registerHostChromeSelection} from '../../nodes/hostChromeSelection';
import {$createSlotContainerNode} from '../../nodes/SlotContainerNode';
import {$appendInline} from '../../nodes/slotImport';
import {
  $createPullQuoteNode,
  $isPullQuoteNode,
  PullQuoteNode,
} from './PullQuoteNode';

export const INSERT_PULLQUOTE_COMMAND: LexicalCommand<void> =
  /* @__PURE__ */ createCommand('INSERT_PULLQUOTE_COMMAND');

// Reconstruct a PullQuoteNode from its exported HTML (see
// PullQuoteNode.exportDOM): a `<div class="lexical-pullquote-node">` wrapping a
// `<div data-lexical-slot="quote">` and `<div data-lexical-slot="attribution">`.
// The quote is multi-block, so it becomes a SlotContainerNode seeded with the
// imported children; the attribution is a single-line slot flattened to its
// inline projection. Both seeds are dropped first so an HTML fragment missing a
// slot can't inherit the default text. The host is a DecoratorNode with no
// children channel, so non-slot children land in the quote slot rather than
// being dropped.
const PullQuoteImportRule = /* @__PURE__ */ defineImportRule({
  $import: (ctx, el) => {
    const pullquote = $createPullQuoteNode();
    $removeSlot(pullquote, 'quote');
    $removeSlot(pullquote, 'attribution');
    const orphans: LexicalNode[] = [];
    for (const domChild of Array.from(el.children)) {
      const slotName = domChild.getAttribute('data-lexical-slot');
      if (slotName === 'quote') {
        $setSlot(
          pullquote,
          slotName,
          $createSlotContainerNode().append(...ctx.$importChildren(domChild)),
        );
      } else if (slotName === 'attribution') {
        $setSlot(
          pullquote,
          slotName,
          $appendInline($createParagraphNode(), ctx.$importChildren(domChild)),
        );
      } else {
        orphans.push(...ctx.$importOne(domChild));
      }
    }
    if (orphans.length > 0) {
      const existing = $getSlot(pullquote, 'quote');
      const quote = $isElementNode(existing)
        ? existing
        : $createSlotContainerNode();
      if (quote !== existing) {
        $setSlot(pullquote, 'quote', quote);
      }
      quote.append(...orphans);
    }
    return [pullquote];
  },
  match: sel.tag('div').classAll('lexical-pullquote-node'),
  name: '@lexical/playground/pullquote-host',
});

export const PullQuoteExtension = /* @__PURE__ */ defineExtension({
  dependencies: [
    // Mirror NodeSelection state onto a `data-selected` attribute on the
    // host DOM so CSS can render the selected outline.
    /* @__PURE__ */ configExtension(NodeSelectionDataSelectedExtension, {
      nodes: [PullQuoteNode],
    }),
    // The PullQuote's HTML import rule rides its own extension (like every
    // other node extension that registers its own DOM-import rules). CoreImport
    // supplies the paragraph/text rules the rule's children-import relies on
    // and orders this host rule ahead of the generic block rules.
    CoreImportExtension,
    /* @__PURE__ */ configExtension(DOMImportExtension, {
      rules: [PullQuoteImportRule],
    }),
  ],
  name: '@lexical/playground/PullQuote',
  register: editor => {
    return mergeRegister(
      editor.registerCommand<void>(
        INSERT_PULLQUOTE_COMMAND,
        () => {
          $insertNodeToNearestRoot($createPullQuoteNode());
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
      // Click on the PullQuote chrome (outside its slot wrappers) selects the
      // whole node as a NodeSelection, with a matching mousedown that
      // suppresses the native caret the browser would otherwise drop there.
      registerHostChromeSelection(editor, $isPullQuoteNode),
    );
  },
});
