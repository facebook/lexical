/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor, LexicalNode} from 'lexical';

import {$isAtEndOfNode, $isAtStartOfNode, mergeRegister} from '@lexical/utils';
import {
  $createParagraphNode,
  $getSelection,
  $getSlot,
  $getSlotHost,
  $getSlotNames,
  $isElementNode,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
} from 'lexical';

// Find the slot host (Card / Review / PullQuote) that contains `start`. The
// caret may be in the host's regular children — getParent reaches the host — or
// in a named slot, where slot values have `__parent === null`, so walk to the
// slot value and resolve its host with $getSlotHost.
function $findSlotHost<T extends LexicalNode>(
  start: LexicalNode,
  $isHost: (node: LexicalNode | null | undefined) => node is T,
): T | null {
  let cur: LexicalNode | null = start;
  while (cur !== null) {
    if ($isHost(cur)) {
      return cur;
    }
    const parent: LexicalNode | null = cur.getParent();
    if (parent === null) {
      const host = $getSlotHost(cur);
      return host !== null && $isHost(host) ? host : null;
    }
    cur = parent;
  }
  return null;
}

// Whether DOM element `a` precedes `b` in document order.
function isBefore(a: HTMLElement, b: HTMLElement): boolean {
  return (
    (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
  );
}

// The host's top-most ('first') or bottom-most ('last') navigable region. A
// host's regions are its children (bounded by the first/last child, since they
// render contiguously into one element) and its named slot values. Nothing
// requires the chrome to render children before, between, or after the slots —
// the Card renders its `title` slot above its body children, the Review renders
// its body children above its `author` slot, a DecoratorNode like PullQuote has
// only slots — so the visual order lives in the DOM, not the model. Pick the
// candidate whose rendered element sits first/last in document order.
function $edgeRegion(
  editor: LexicalEditor,
  host: LexicalNode,
  edge: 'first' | 'last',
): LexicalNode | null {
  const candidates: LexicalNode[] = [];
  if ($isElementNode(host)) {
    const child = edge === 'first' ? host.getFirstChild() : host.getLastChild();
    if (child !== null) {
      candidates.push(child);
    }
  }
  for (const name of $getSlotNames(host)) {
    const value = $getSlot(host, name);
    if (value !== null) {
      candidates.push(value);
    }
  }
  let best: LexicalNode | null = null;
  let bestDom: HTMLElement | null = null;
  for (const candidate of candidates) {
    const dom = editor.getElementByKey(candidate.getKey());
    if (dom === null) {
      continue;
    }
    if (
      bestDom === null ||
      (edge === 'first' ? isBefore(dom, bestDom) : isBefore(bestDom, dom))
    ) {
      best = candidate;
      bestDom = dom;
    }
  }
  return best;
}

/**
 * Slot-aware companion to `$onEscapeDown` / `$onEscapeUp` (@lexical/utils): let
 * ArrowDown at the bottom of a slot host (Card / Review / PullQuote) and ArrowUp
 * at its top step out of the host when it is the last/first block, so it is
 * never a dead end. Those helpers walk `getParent` to find the container, which
 * can't reach a host from inside a named slot (slot values have
 * `__parent === null`) and are typed for `ElementNode` containers (PullQuote is
 * a `DecoratorNode`); this resolves the host with `$getSlotHost`, finds the
 * host's top/bottom region from the rendered DOM order (see {@link $edgeRegion}),
 * and reuses their shared edge checks ({@link $isAtStartOfNode} /
 * {@link $isAtEndOfNode}).
 *
 * The browser already steps the caret between a host's editable regions and into
 * an adjacent sibling on its own, even across the `contentEditable=false` chrome
 * of a React-chromed host; the gap those native moves leave is the dead end when
 * the host is the *first or last* block with nowhere to go. So this only acts
 * there — inserting a paragraph before/after the host and moving to it — and
 * defers to the browser otherwise (returning `false`).
 */
export function registerSlotHostArrowEscape<T extends LexicalNode>(
  editor: LexicalEditor,
  $isHost: (node: LexicalNode | null | undefined) => node is T,
): () => void {
  return mergeRegister(
    editor.registerCommand<KeyboardEvent | null>(
      KEY_ARROW_DOWN_COMMAND,
      event => {
        if (event !== null && event.altKey) {
          return false;
        }
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
          return false;
        }
        const host = $findSlotHost(selection.anchor.getNode(), $isHost);
        // Mirror $onEscapeDown: only escape when the host is the last block, so
        // ArrowDown into a following sibling still goes through the browser.
        if (host === null || host.getNextSibling() !== null) {
          return false;
        }
        const region = $edgeRegion(editor, host, 'last');
        if (
          !$isElementNode(region) ||
          !$isAtEndOfNode(selection.anchor, region)
        ) {
          return false;
        }
        host.insertAfter($createParagraphNode()).selectEnd();
        if (event) {
          event.preventDefault();
        }
        return true;
      },
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand<KeyboardEvent | null>(
      KEY_ARROW_UP_COMMAND,
      event => {
        if (event !== null && event.altKey) {
          return false;
        }
        const selection = $getSelection();
        if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
          return false;
        }
        const host = $findSlotHost(selection.anchor.getNode(), $isHost);
        // Mirror $onEscapeUp: only escape when the host is the first block.
        if (host === null || host.getPreviousSibling() !== null) {
          return false;
        }
        const region = $edgeRegion(editor, host, 'first');
        if (
          !$isElementNode(region) ||
          !$isAtStartOfNode(selection.anchor, region)
        ) {
          return false;
        }
        host.insertBefore($createParagraphNode()).selectEnd();
        if (event) {
          event.preventDefault();
        }
        return true;
      },
      COMMAND_PRIORITY_LOW,
    ),
  );
}
