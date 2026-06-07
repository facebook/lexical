/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalCommand, LexicalEditor} from 'lexical';

import {
  $defaultShouldInsertAfter,
  ClickAfterLastBlockExtension,
  NodeSelectionDataSelectedExtension,
} from '@lexical/extension';
import {
  $findMatchingParent,
  $insertNodeToNearestRoot,
  mergeRegister,
} from '@lexical/utils';
import {
  $createNodeSelection,
  $getAdjacentNode,
  $getNearestNodeFromDOMNode,
  $getSelection,
  $isRangeSelection,
  $setSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_BEFORE_EDITOR,
  COMMAND_PRIORITY_EDITOR,
  configExtension,
  createCommand,
  defineExtension,
  getDOMSelection,
  isHTMLElement,
  KEY_ARROW_LEFT_COMMAND,
  KEY_ARROW_RIGHT_COMMAND,
} from 'lexical';

import {$createCardNode, $isCardNode, CardNode} from '../../nodes/CardNode';

export const INSERT_CARD_COMMAND: LexicalCommand<void> = createCommand(
  'INSERT_CARD_COMMAND',
);

// Promote a RangeSelection adjacent to a CardNode boundary into a
// NodeSelection on the Card. Once the NodeSelection is set, the
// lexical-rich-text KEY_ARROW_* handlers already step out of it via
// selectPrevious()/selectNext(), so there's no NodeSelection branch
// here — this only handles the range→node promotion.
//
// Priority needs to run before lexical-rich-text's EDITOR-priority
// RangeSelection branch so we can intercept the caret step into the
// Card's title interior. BEFORE_EDITOR is the same bucket but unshifted
// to the queue head — the lowest priority that still wins this race.
function $handleCardArrow(
  event: KeyboardEvent | null,
  isBackward: boolean,
): boolean {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || event?.shiftKey) {
    return false;
  }
  const adjacent = $getAdjacentNode(selection.focus, isBackward);
  if (!$isCardNode(adjacent)) {
    return false;
  }
  event?.preventDefault();
  const ns = $createNodeSelection();
  ns.add(adjacent.getKey());
  $setSelection(ns);
  return true;
}

// Resolve a click / mousedown target to the CardNode a chrome interaction
// should select, or null when the target is outside any Card or inside an
// editable slot (where the caret must enter the paragraph normally). Shared
// by the CLICK_COMMAND promotion and the mousedown caret suppression so the
// two stay in lockstep.
function $resolveCardChromeTarget(
  editor: LexicalEditor,
  target: HTMLElement,
): CardNode | null {
  const node = $getNearestNodeFromDOMNode(target);
  if (node === null) {
    return null;
  }
  const card = $isCardNode(node)
    ? node
    : $findMatchingParent(node, $isCardNode);
  if (card === null) {
    return null;
  }
  const hostElement = editor.getElementByKey(card.getKey());
  if (hostElement === null || !hostElement.contains(target)) {
    return null;
  }
  // Clicks inside an editable slot region (the title / body paragraph or any
  // descendant) keep the lexical default — the caret enters the paragraph
  // normally. The closest() walk is bounded with
  // `hostElement.contains(editableAncestor)` so an editable widget that sits
  // outside the host (or contentEditable=true scaffolding above the editor)
  // does not suppress the chrome interaction.
  const editableAncestor = target.closest('[contenteditable="true"]');
  if (editableAncestor !== null && hostElement.contains(editableAncestor)) {
    return null;
  }
  return card;
}

export const CardExtension = defineExtension({
  dependencies: [
    // The default `$shouldInsertAfter` predicate only picks up block
    // decorators that opt in; this override adds the Card so that clicking
    // the empty area below a trailing Card inserts a fresh paragraph after
    // it instead of leaving the caret in an awkward place.
    configExtension(ClickAfterLastBlockExtension, {
      $shouldInsertAfter: node =>
        $defaultShouldInsertAfter(node) || $isCardNode(node),
    }),
    // Mirror the NodeSelection state onto a `data-selected` attribute on each
    // Card's host DOM so CSS can render the selected outline. The Card's
    // chrome is rendered through `decorate()`, but selecting the whole Card is
    // driven from the extension's CLICK_COMMAND below, so the attribute is set
    // here rather than via `useLexicalNodeSelection` inside the component.
    configExtension(NodeSelectionDataSelectedExtension, {nodes: [CardNode]}),
  ],
  name: '@lexical/playground/Card',
  register: editor => {
    const onChromeMouseDown = (event: MouseEvent) => {
      const target = event.target;
      if (!isHTMLElement(target)) {
        return;
      }
      const isChrome = editor.read(
        () => $resolveCardChromeTarget(editor, target) !== null,
      );
      if (isChrome) {
        event.preventDefault();
        // Move focus off any slot's contentEditable onto the editor root so
        // the chrome click resolves to a clean whole-Card NodeSelection. The
        // preventDefault above suppresses the native focus shift, so without
        // this the slot keeps DOM focus: its :focus-within highlight stays lit
        // alongside the Card's selected outline, and the keyboard selection
        // (now a NodeSelection) is out of sync with the focused slot, so
        // Backspace never reaches the Card-delete path.
        const root = editor.getRootElement();
        if (root !== null && root !== document.activeElement) {
          root.focus({preventScroll: true});
          // root.focus() drops a native caret where the slot focus was; clear
          // it in this same synchronous turn so it never paints before the
          // click promotes the chrome interaction to a whole-Card
          // NodeSelection. Safari/Chrome would otherwise flash the caret in
          // the paragraph above the Card for a frame.
          const domSelection = getDOMSelection(root.ownerDocument.defaultView);
          if (domSelection !== null) {
            domSelection.removeAllRanges();
          }
        }
      }
    };
    return mergeRegister(
      editor.registerCommand<void>(
        INSERT_CARD_COMMAND,
        () => {
          $insertNodeToNearestRoot($createCardNode());
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
      editor.registerCommand<KeyboardEvent | null>(
        KEY_ARROW_RIGHT_COMMAND,
        event => $handleCardArrow(event, false),
        COMMAND_PRIORITY_BEFORE_EDITOR,
      ),
      editor.registerCommand<KeyboardEvent | null>(
        KEY_ARROW_LEFT_COMMAND,
        event => $handleCardArrow(event, true),
        COMMAND_PRIORITY_BEFORE_EDITOR,
      ),
      // Click on the Card chrome (the host DOM itself, outside the slot
      // containers) selects the whole Card as a NodeSelection. Routing
      // through CLICK_COMMAND rather than a DOM onClick lets the
      // selectionchange flow on the same lexical pass, so the freshly-set
      // NodeSelection isn't overwritten by the native click → focus →
      // range-selection fallback.
      editor.registerCommand<MouseEvent>(
        CLICK_COMMAND,
        event => {
          const target = event.target;
          if (!isHTMLElement(target)) {
            return false;
          }
          const card = $resolveCardChromeTarget(editor, target);
          if (card === null) {
            return false;
          }
          event.preventDefault();
          const ns = $createNodeSelection();
          ns.add(card.getKey());
          $setSelection(ns);
          return true;
        },
        COMMAND_PRIORITY_BEFORE_EDITOR,
      ),
      // Suppress the native caret the browser would place at the mousedown
      // point before the CLICK_COMMAND above promotes a chrome click to a
      // whole-Card NodeSelection. Without this the caret flashes in the
      // clicked region for a frame. Editable-slot mousedowns fall through so
      // the caret still enters the slot.
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
