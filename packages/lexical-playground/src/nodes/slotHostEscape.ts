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

// Default bottom-most navigable region for the common "slots render first, then
// children" layout (Card, PullQuote): the last child if the host has one, else
// — for a childless host like the DecoratorNode PullQuote — its last named slot
// value. A host whose chrome lays its regions out in a different order (e.g. the
// Review renders its children above its `author` slot) passes a `$bottomRegion`
// override instead.
function $defaultBottomRegion(host: LexicalNode): LexicalNode | null {
  if ($isElementNode(host)) {
    const lastChild = host.getLastChild();
    if (lastChild !== null) {
      return lastChild;
    }
  }
  const names = $getSlotNames(host);
  return names.length > 0 ? $getSlot(host, names[names.length - 1]) : null;
}

// Default top-most navigable region for the same slots-first layout: the first
// named slot value, or — with no slots — the first child. Overridden via
// `$topRegion` for hosts that order their regions differently.
function $defaultTopRegion(host: LexicalNode): LexicalNode | null {
  const names = $getSlotNames(host);
  if (names.length > 0) {
    return $getSlot(host, names[0]);
  }
  return $isElementNode(host) ? host.getFirstChild() : null;
}

export interface SlotHostArrowEscapeOptions<T extends LexicalNode> {
  /**
   * The host's top-most navigable region, used by the ArrowUp handler. Defaults
   * to the first named slot value (else the first child), which matches a
   * slots-first chrome like Card / PullQuote. Override it when the chrome lays
   * its regions out in another order — the Review renders its body children
   * above its `author` slot, so its top region is the first body child.
   */
  $topRegion?: (host: T) => LexicalNode | null;
  /**
   * The host's bottom-most navigable region, used by the ArrowDown handler.
   * Defaults to the last child (else the last named slot value). Override it for
   * a non-slots-first chrome — the Review's bottom region is its `author` slot,
   * which renders below the body children.
   */
  $bottomRegion?: (host: T) => LexicalNode | null;
}

/**
 * Slot-aware companion to `$onEscapeDown` / `$onEscapeUp` (@lexical/utils): let
 * ArrowDown at the bottom of a slot host (Card / Review / PullQuote) and ArrowUp
 * at its top step out of the host when it is the last/first block, so it is
 * never a dead end. Those helpers walk `getParent` to find the container, which
 * can't reach a host from inside a named slot (slot values have
 * `__parent === null`) and are typed for `ElementNode` containers (PullQuote is
 * a `DecoratorNode`); this resolves the host with `$getSlotHost` and reuses
 * their shared edge checks ({@link $isAtStartOfNode} / {@link $isAtEndOfNode}).
 *
 * The browser already steps the caret between a host's editable regions and into
 * an adjacent sibling on its own, even across the `contentEditable=false` chrome
 * of a React-chromed host; the gap those native moves leave is the dead end when
 * the host is the *first or last* block with nowhere to go. So this only acts
 * there — inserting a paragraph before/after the host and moving to it — and
 * defers to the browser otherwise (returning `false`).
 *
 * The top/bottom regions default to a slots-first chrome (Card / PullQuote);
 * pass {@link SlotHostArrowEscapeOptions.$topRegion} / `$bottomRegion` for a host
 * that orders its regions differently (the Review's body children render above
 * its `author` slot).
 */
export function registerSlotHostArrowEscape<T extends LexicalNode>(
  editor: LexicalEditor,
  $isHost: (node: LexicalNode | null | undefined) => node is T,
  options: SlotHostArrowEscapeOptions<T> = {},
): () => void {
  const $bottomRegion = options.$bottomRegion ?? $defaultBottomRegion;
  const $topRegion = options.$topRegion ?? $defaultTopRegion;
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
        const region = $bottomRegion(host);
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
        const region = $topRegion(host);
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
