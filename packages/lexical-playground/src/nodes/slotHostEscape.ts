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

// The host's bottom-most navigable region: its last child (children render
// after slots in DOM order), or — for a host with no children, like the
// DecoratorNode PullQuote — its last named slot value.
function $bottomRegion(host: LexicalNode): LexicalNode | null {
  if ($isElementNode(host)) {
    const lastChild = host.getLastChild();
    if (lastChild !== null) {
      return lastChild;
    }
  }
  const names = $getSlotNames(host);
  return names.length > 0 ? $getSlot(host, names[names.length - 1]) : null;
}

// The host's top-most navigable region: its first named slot value (slots
// render first), or — with no slots — its first child.
function $topRegion(host: LexicalNode): LexicalNode | null {
  const names = $getSlotNames(host);
  if (names.length > 0) {
    return $getSlot(host, names[0]);
  }
  return $isElementNode(host) ? host.getFirstChild() : null;
}

/**
 * Slot-aware companion to `$onEscapeDown` / `$onEscapeUp` (@lexical/utils): let
 * ArrowDown at the bottom of a slot host (Card / Review / PullQuote) and ArrowUp
 * at its top step out of the host, so it is never a dead end. Those helpers walk
 * `getParent` to find the container, which can't reach a host from inside a
 * named slot (slot values have `__parent === null`) and are typed for
 * `ElementNode` containers (PullQuote is a `DecoratorNode`); this resolves the
 * host with `$getSlotHost` and treats the last child *or* last slot as the
 * bottom region, while reusing their shared edge checks
 * ({@link $isAtStartOfNode} / {@link $isAtEndOfNode}).
 *
 * Like those helpers it only acts when the host is the first/last block — it
 * inserts a paragraph before/after the host and moves there — and otherwise
 * defers to the default handler that steps into the adjacent sibling.
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
        // ArrowDown into a following sibling still goes through the default
        // handler.
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
