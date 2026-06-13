/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  LexicalCommand,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  PointType,
} from 'lexical';

import {NodeSelectionDataSelectedExtension} from '@lexical/extension';
import {domOverride, DOMRenderExtension} from '@lexical/html';
import {$insertNodeToNearestRoot, mergeRegister} from '@lexical/utils';
import {
  $createNodeSelection,
  $createParagraphNode,
  $getAdjacentNode,
  $getNearestNodeFromDOMNode,
  $getSelection,
  $getSlot,
  $getSlotHost,
  $getSlotNameWithinHost,
  $isElementNode,
  $isRangeSelection,
  $isTextNode,
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
  KEY_TAB_COMMAND,
} from 'lexical';

import {$createCardNode, $isCardNode, CardNode} from './CardNode';

export const INSERT_CARD_COMMAND: LexicalCommand<void> =
  /* @__PURE__ */ createCommand('INSERT_CARD_COMMAND');

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

// Walk up from `start` looking for a slot child whose host is a Card; report
// which named slot (or the body's regular children) the caret sits in.
// Returns `null` when the caret is not inside a CardNode at all. Used by the
// Tab handler — the first real consumer of `$getSlotNameWithinHost`, which
// answers "which named slot does this node sit in?" so an event-bubbling
// handler can establish relative order between slots and children.
function $findCardSlotContext(
  start: LexicalNode,
):
  | {card: CardNode; in: 'title'; slotValue: LexicalNode}
  | {card: CardNode; in: 'body'}
  | null {
  let cursor: LexicalNode | null = start;
  while (cursor !== null) {
    const slotName = $getSlotNameWithinHost(cursor);
    if (slotName === 'title') {
      const host = $getSlotHost(cursor);
      if ($isCardNode(host)) {
        return {card: host, in: 'title', slotValue: cursor};
      }
    }
    const parent: LexicalNode | null = cursor.getParent();
    if ($isCardNode(parent)) {
      return {card: parent, in: 'body'};
    }
    cursor = parent ?? $getSlotHost(cursor);
  }
  return null;
}

// True when `point` sits at the very end of `block`'s text content — the
// caret is on the block's last text child at the text length, or on an empty
// block at offset 0. Used by the Tab handler so it only fires at the slot's
// trailing edge and leaves Tab as a normal indent everywhere else.
function $isAtBlockEnd(point: PointType, block: LexicalNode): boolean {
  if (!$isElementNode(block)) {
    return false;
  }
  const last = block.getLastDescendant();
  if (last === null) {
    return point.key === block.getKey() && point.offset === 0;
  }
  if ($isTextNode(last)) {
    return (
      point.key === last.getKey() && point.offset === last.getTextContentSize()
    );
  }
  return false;
}

// Mirror of $isAtBlockEnd for the leading edge.
function $isAtBlockStart(point: PointType, block: LexicalNode): boolean {
  if (!$isElementNode(block)) {
    return false;
  }
  const first = block.getFirstDescendant();
  if (first === null) {
    return point.key === block.getKey() && point.offset === 0;
  }
  if ($isTextNode(first)) {
    return point.key === first.getKey() && point.offset === 0;
  }
  return false;
}

// Tab moves focus between the title slot and the body, but only at the slot
// boundary — Tab at the end of the title slot's last paragraph drops the
// caret at the start of the body, Shift+Tab at the start of the body's first
// paragraph drops it at the end of the title slot. Mid-title and mid-body
// Tab / Shift+Tab fall through to the rich-text indent default. This is a
// small PoC for the use case `$getSlotNameWithinHost` was introduced for: an
// event handler that needs to know which slot the caret came from so it can
// pick the right destination.
function $handleCardTab(
  event: KeyboardEvent | null,
  isBackward: boolean,
): boolean {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return false;
  }
  const context = $findCardSlotContext(selection.anchor.getNode());
  if (context === null) {
    return false;
  }
  if (!isBackward && context.in === 'title') {
    // The slot value IS the caret block: the title is a bare single-line
    // paragraph (the slot link itself is the virtual shadow root, no
    // container wrapper). $isAtBlockEnd reads getLastDescendant, so the
    // check is anchored at the slot's trailing edge either way.
    const titleBlock = context.slotValue;
    if (
      !$isElementNode(titleBlock) ||
      !$isAtBlockEnd(selection.anchor, titleBlock)
    ) {
      return false;
    }
    const bodyFirst = context.card.getFirstChild();
    if ($isElementNode(bodyFirst)) {
      event?.preventDefault();
      bodyFirst.selectStart();
      return true;
    }
    // No element body to receive the caret: seed an empty paragraph and move
    // into it. Falling through here would hand Tab to the rich-text indent
    // default, which indents the title paragraph instead of bridging.
    event?.preventDefault();
    const bodyParagraph = $createParagraphNode();
    if (bodyFirst === null) {
      context.card.append(bodyParagraph);
    } else {
      bodyFirst.insertBefore(bodyParagraph);
    }
    bodyParagraph.select();
    return true;
  } else if (isBackward && context.in === 'body') {
    const bodyFirst = context.card.getFirstChild();
    if (bodyFirst === null || !$isAtBlockStart(selection.anchor, bodyFirst)) {
      return false;
    }
    // The title slot value is itself the caret block (a bare paragraph), so
    // the caret lands at its end directly — no container to descend into.
    const titleSlot = $getSlot(context.card, 'title');
    if ($isElementNode(titleSlot)) {
      event?.preventDefault();
      titleSlot.selectEnd();
      return true;
    }
  }
  return false;
}

// Resolve a click / mousedown target to the CardNode a chrome interaction
// should select, or null when the target is inside the title slot or body
// children (where the caret must enter the paragraph normally). The Card is
// an ElementNode host, so $getNearestNodeFromDOMNode resolves the target to
// the CardNode itself only when the click landed on the card's own chrome
// (border / padding around its children); a click on a body paragraph or a
// title slot descendant resolves to that node, not the card. Shared by the
// CLICK_COMMAND promotion and the mousedown caret suppression so the two
// stay in lockstep.
function $resolveCardChromeTarget(
  editor: LexicalEditor,
  target: HTMLElement,
): CardNode | null {
  const node = $getNearestNodeFromDOMNode(target);
  if (!$isCardNode(node)) {
    return null;
  }
  const hostElement = editor.getElementByKey(node.getKey());
  if (hostElement === null || !hostElement.contains(target)) {
    return null;
  }
  // The reconciler wraps each slot in a keyless `<div data-lexical-slot=...>`
  // scaffold; a click on the wrapper's padding / border / ::before label
  // ($getNearestNodeFromDOMNode walks past keyless ancestors) would otherwise
  // resolve to the Card and promote — turning a click on the visible "TITLE"
  // hint into a whole-Card selection instead of entering the slot. Only a
  // wrapper inside this Card's own DOM counts: when the Card is itself nested
  // in another host's slot, the OUTER wrapper contains the whole Card and
  // must not turn its chrome into a dead zone.
  const slotWrapper = target.closest('[data-lexical-slot]');
  if (slotWrapper !== null && hostElement.contains(slotWrapper)) {
    return null;
  }
  return node;
}

export const CardExtension = /* @__PURE__ */ defineExtension({
  dependencies: [
    // No ClickAfterLastBlockExtension override: CardNode.isShadowRoot() is
    // true, so `$defaultShouldInsertAfter` already matches a trailing Card
    // (see the CardNode unit test pinning this). An override here would also
    // clobber the app-level predicate — the extension's last-wins shallow
    // config merge drops every other contributor's terms.
    // Mirror the NodeSelection state onto a `data-selected` attribute on each
    // Card's host DOM so CSS can render the selected outline. The Card's
    // chrome is rendered through `decorate()`, but selecting the whole Card is
    // driven from the extension's CLICK_COMMAND below, so the attribute is set
    // here rather than via `useLexicalNodeSelection` inside the component.
    /* @__PURE__ */ configExtension(NodeSelectionDataSelectedExtension, {
      nodes: [CardNode],
    }),
    // The Card renders its slots entirely in-lexical (no React chrome), so
    // it attaches the title synchronously through the render config:
    // returning the host DOM reveals the container in its default
    // slots-first position within the same commit that renders it — the
    // named-slot analog of $getDOMSlot.
    /* @__PURE__ */ configExtension(DOMRenderExtension, {
      overrides: [
        /* @__PURE__ */ domOverride([CardNode], {
          $getSlotTargetElement: (_node, _slotName, hostDom) => hostDom,
        }),
      ],
    }),
  ],
  name: '@lexical/playground/Card',
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
      editor.registerCommand<KeyboardEvent>(
        KEY_TAB_COMMAND,
        event => $handleCardTab(event, event.shiftKey),
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
          // Read-only mode never promotes — mirrors the mousedown gate.
          if (!editor.isEditable()) {
            return false;
          }
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
      // Mirror the caret's slot context onto a `data-current-slot` attribute
      // on the active Card so CSS can render a focus hint. The (cardKey,
      // slot) memo + read-scope-outside mutation mirror the
      // NodeSelectionDataSelectedExtension shape so this stays off the
      // every-keystroke hot path; the matching CSS sticks to border-color
      // and box-shadow (no `content` / `display` changes) to avoid any
      // layout reflow on the same frame as a forward-delete keystroke,
      // which would otherwise drop the keystroke in Firefox / WebKit.
      (() => {
        let prevCardKey: NodeKey | null = null;
        let prevSlot: 'title' | 'body' | null = null;
        return editor.registerUpdateListener(({editorState}) => {
          let activeCardKey: NodeKey | null = null;
          let activeSlot: 'title' | 'body' | null = null;
          editorState.read(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              const context = $findCardSlotContext(selection.anchor.getNode());
              if (context !== null) {
                activeCardKey = context.card.getKey();
                activeSlot = context.in;
              }
            }
          });
          if (prevCardKey === activeCardKey && prevSlot === activeSlot) {
            return;
          }
          if (prevCardKey !== null && prevCardKey !== activeCardKey) {
            const dom = editor.getElementByKey(prevCardKey);
            if (dom !== null) {
              dom.removeAttribute('data-current-slot');
            }
          }
          if (activeCardKey !== null && activeSlot !== null) {
            const dom = editor.getElementByKey(activeCardKey);
            if (dom !== null) {
              dom.setAttribute('data-current-slot', activeSlot);
            }
          }
          prevCardKey = activeCardKey;
          prevSlot = activeSlot;
        });
      })(),
    );
  },
});
