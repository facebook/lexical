/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalCommand, LexicalEditor} from 'lexical';

import {NodeSelectionDataSelectedExtension} from '@lexical/extension';
import {$insertNodeToNearestRoot, mergeRegister} from '@lexical/utils';
import {
  $createNodeSelection,
  $getNearestNodeFromDOMNode,
  $setSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_BEFORE_EDITOR,
  COMMAND_PRIORITY_EDITOR,
  configExtension,
  createCommand,
  defineExtension,
  getDOMSelection,
  isHTMLElement,
} from 'lexical';

import {
  $createPullQuoteNode,
  $isPullQuoteNode,
  PullQuoteNode,
} from './PullQuoteNode';

export const INSERT_PULLQUOTE_COMMAND: LexicalCommand<void> =
  /* @__PURE__ */ createCommand('INSERT_PULLQUOTE_COMMAND');

// Resolve a click / mousedown target to the PullQuoteNode a chrome
// interaction should select, or null when the target is inside one of the
// editable slots (where the caret must enter the slot normally). Both
// slots ride inside keyless `<div data-lexical-slot="...">` reconciler
// wrappers — without the explicit guard, $getNearestNodeFromDOMNode would
// walk past those wrappers to the PullQuote and the CLICK_COMMAND would
// promote, dropping the caret out of the slot the user just clicked into.
function $resolveChromeTarget(
  editor: LexicalEditor,
  target: HTMLElement,
): PullQuoteNode | null {
  const node = $getNearestNodeFromDOMNode(target);
  if (!$isPullQuoteNode(node)) {
    return null;
  }
  const hostElement = editor.getElementByKey(node.getKey());
  if (hostElement === null || !hostElement.contains(target)) {
    return null;
  }
  // Only a slot wrapper inside this PullQuote's own DOM bails: when the
  // PullQuote is itself nested in another host's slot, the OUTER wrapper
  // contains the whole PullQuote and must not turn its chrome into a dead
  // zone. Same shape as the Card resolver.
  const slotWrapper = target.closest('[data-lexical-slot]');
  if (slotWrapper !== null && hostElement.contains(slotWrapper)) {
    return null;
  }
  return node;
}

export const PullQuoteExtension = /* @__PURE__ */ defineExtension({
  dependencies: [
    // Mirror NodeSelection state onto a `data-selected` attribute on the
    // host DOM so CSS can render the selected outline.
    /* @__PURE__ */ configExtension(NodeSelectionDataSelectedExtension, {
      nodes: [PullQuoteNode],
    }),
  ],
  name: '@lexical/playground/PullQuote',
  register: editor => {
    const onChromeMouseDown = (event: MouseEvent) => {
      // Read-only mode: leave the reader's native selection alone — the
      // preventDefault / focus / removeAllRanges below would destroy it.
      if (!editor.isEditable()) {
        return;
      }
      const target = event.target;
      if (!isHTMLElement(target)) {
        return;
      }
      const isChrome = editor.read(
        () => $resolveChromeTarget(editor, target) !== null,
      );
      if (isChrome) {
        event.preventDefault();
        // Move DOM focus off any slot's contentEditable onto the editor
        // root so the chrome click resolves to a clean whole-PullQuote
        // NodeSelection. Without this the slot keeps DOM focus, its
        // `:focus-within` highlight stays lit alongside the host's
        // `[data-selected]` outline, and a follow-up Backspace dispatches
        // to the focused slot's range path instead of the host-delete
        // path. Same shape Card uses for the same reason.
        const root = editor.getRootElement();
        if (root !== null && root !== document.activeElement) {
          root.focus({preventScroll: true});
          const domSelection = getDOMSelection(root.ownerDocument.defaultView);
          if (domSelection !== null) {
            domSelection.removeAllRanges();
          }
        }
      }
    };
    return mergeRegister(
      editor.registerCommand<void>(
        INSERT_PULLQUOTE_COMMAND,
        () => {
          $insertNodeToNearestRoot($createPullQuoteNode());
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
      editor.registerCommand<MouseEvent>(
        CLICK_COMMAND,
        event => {
          // Read-only mode never promotes — mirrors the mousedown gate.
          if (!editor.isEditable()) {
            return false;
          }
          const target = event.target;
          if (!isHTMLElement(target)) {
            return false;
          }
          const node = $resolveChromeTarget(editor, target);
          if (node === null) {
            return false;
          }
          event.preventDefault();
          const ns = $createNodeSelection();
          ns.add(node.getKey());
          $setSelection(ns);
          return true;
        },
        COMMAND_PRIORITY_BEFORE_EDITOR,
      ),
      editor.registerRootListener((rootElement, prevRootElement) => {
        if (prevRootElement !== null) {
          prevRootElement.removeEventListener('mousedown', onChromeMouseDown);
        }
        if (rootElement !== null) {
          rootElement.addEventListener('mousedown', onChromeMouseDown);
        }
      }),
    );
  },
});
