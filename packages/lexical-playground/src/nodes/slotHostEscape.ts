/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $insertNodeToNearestRoot,
  $isAtEndOfNode,
  $isAtStartOfNode,
} from '@lexical/utils';
import {
  $createParagraphNode,
  $getSelection,
  $getSlot,
  $getSlotHost,
  $getSlotNames,
  $isElementNode,
  $isParagraphNode,
  $isRangeSelection,
  COMMAND_PRIORITY_BEFORE_EDITOR,
  COMMAND_PRIORITY_LOW,
  isModifierMatch,
  KEY_ARROW_DOWN_COMMAND,
  KEY_ARROW_UP_COMMAND,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  type LexicalEditor,
  type LexicalNode,
  mergeRegister,
  type RangeSelection,
} from 'lexical';

// Find the slot host (Card / Review / PullQuote) that contains `start`. The
// caret may be in the host's regular children — getParent reaches the host — or
// in a named slot, where slot values have `__parent === null`, so walk to the
// slot value and resolve its host with $getSlotHost.
export function $findSlotHost<T extends LexicalNode>(
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

// A navigable region of a host: a named slot value, or the host's children as a
// unit (bounded by the first/last child, which render contiguously into one
// element — the browser already steps between the children, so they are one
// region for cross-region navigation). `startNode` is where the caret enters
// from above; `endNode`'s end is the region's bottom edge.
interface Region {
  startNode: LexicalNode;
  endNode: LexicalNode;
  isChildren: boolean;
}

// Whether DOM element `a` precedes `b` in document order.
function isBefore(a: HTMLElement, b: HTMLElement): boolean {
  return (
    (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
  );
}

// The host's regions in rendered (visual) order. Nothing requires the chrome to
// render children before, between, or after the named slots — the Card renders
// its `title` slot above its body, the Review renders its body above its
// `author` slot — so order by the regions' actual document position rather than
// assuming one.
function $orderedRegions(editor: LexicalEditor, host: LexicalNode): Region[] {
  const regions: Region[] = [];
  if ($isElementNode(host)) {
    const first = host.getFirstChild();
    const last = host.getLastChild();
    if (first !== null && last !== null) {
      regions.push({endNode: last, isChildren: true, startNode: first});
    }
  }
  for (const name of $getSlotNames(host)) {
    const value = $getSlot(host, name);
    if (value !== null) {
      regions.push({endNode: value, isChildren: false, startNode: value});
    }
  }
  return regions.sort((a, b) => {
    const aDom = editor.getElementByKey(a.startNode.getKey());
    const bDom = editor.getElementByKey(b.startNode.getKey());
    // Every region is mounted whenever a key handler runs, so a null lookup is
    // not expected; fall back to insertion order rather than throwing.
    if (aDom === null || bDom === null) {
      return 0;
    }
    return isBefore(aDom, bDom) ? -1 : 1;
  });
}

// Whether `anchorNode` sits within `region`.
function $regionContains(
  region: Region,
  anchorNode: LexicalNode,
  host: LexicalNode,
): boolean {
  if (region.isChildren) {
    for (
      let b: LexicalNode | null = anchorNode;
      b !== null;
      b = b.getParent()
    ) {
      if (b.getParent() === host) {
        return true;
      }
    }
    return false;
  }
  const value = region.startNode;
  return (
    value === anchorNode ||
    ($isElementNode(value) && value.isParentOf(anchorNode))
  );
}

// The contentEditable editing host of a node's rendered element. Two regions
// that share one (e.g. the Card's slots, which are not contentEditable islands)
// are navigated natively; two that differ (the Review / PullQuote chrome wraps
// each region in its own contentEditable=true island under a
// contentEditable=false shell) are an island boundary the browser may not cross.
function $editingHost(
  editor: LexicalEditor,
  node: LexicalNode,
): Element | null {
  const dom = editor.getElementByKey(node.getKey());
  return dom === null ? null : dom.closest('[contenteditable="true"]');
}

function $handleSlotHostArrow<T extends LexicalNode>(
  editor: LexicalEditor,
  $isHost: (node: LexicalNode | null | undefined) => node is T,
  event: KeyboardEvent | null,
  down: boolean,
): boolean {
  // Only a plain ArrowDown/Up escapes; a modified arrow (word/line/doc jump or
  // selection extend) is left to the browser. (Shift is also caught below by the
  // collapsed-selection check.)
  if (event !== null && !isModifierMatch(event, {})) {
    return false;
  }
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) {
    return false;
  }
  const anchor = selection.anchor;
  const host = $findSlotHost(anchor.getNode(), $isHost);
  if (host === null) {
    return false;
  }
  const regions = $orderedRegions(editor, host);
  const index = regions.findIndex(r =>
    $regionContains(r, anchor.getNode(), host),
  );
  if (index === -1) {
    return false;
  }
  const region = regions[index];
  // Only act at the trailing (down) / leading (up) edge of the current region;
  // mid-region — including between visual lines of a wrapped text node, since
  // $isAtEndOfNode / $isAtStartOfNode check the offset — defers to the browser.
  const edgeNode = down ? region.endNode : region.startNode;
  if (!$isElementNode(edgeNode)) {
    return false;
  }
  if (
    down
      ? !$isAtEndOfNode(anchor, edgeNode)
      : !$isAtStartOfNode(anchor, edgeNode)
  ) {
    return false;
  }
  const adjacent = regions[index + (down ? 1 : -1)];
  if (adjacent !== undefined) {
    // Step into the adjacent region. The browser does this on its own when both
    // regions share an editing host (the Card), so only take over across an
    // island boundary (Review / PullQuote), which Firefox will not cross.
    const from = $editingHost(editor, edgeNode);
    const to = $editingHost(
      editor,
      down ? adjacent.startNode : adjacent.endNode,
    );
    if (from === null || to === null || from === to) {
      return false;
    }
    if (down) {
      adjacent.startNode.selectStart();
    } else {
      adjacent.endNode.selectEnd();
    }
    if (event) {
      event.preventDefault();
    }
    return true;
  }
  // No adjacent region: the caret is at the very bottom/top of the host. Mirror
  // $onEscapeDown / $onEscapeUp — insert a paragraph only when the host is the
  // last/first block, otherwise leave stepping into a sibling to the browser.
  if ((down ? host.getNextSibling() : host.getPreviousSibling()) !== null) {
    return false;
  }
  const paragraph = $createParagraphNode();
  if (down) {
    host.insertAfter(paragraph);
  } else {
    host.insertBefore(paragraph);
  }
  paragraph.selectEnd();
  if (event) {
    event.preventDefault();
  }
  return true;
}

/**
 * Slot-aware companion to `$onEscapeDown` / `$onEscapeUp` (@lexical/utils) for
 * slot hosts (Card / Review / PullQuote). Two jobs:
 *
 * 1. Step the caret between a host's regions (its named slots and its children)
 *    at their shared edge. The browser does this natively when the regions share
 *    an editing host, but the Review / PullQuote chrome renders each region as
 *    its own `contentEditable=true` island under a `contentEditable=false`
 *    shell, and Firefox will not move the caret across that boundary — so the
 *    move is done programmatically across an island boundary (see
 *    {@link $editingHost}).
 * 2. When the caret is at the very top/bottom of the host and the host is the
 *    first/last block, insert a paragraph before/after it so the host is never a
 *    navigational dead end (stepping into an existing sibling is left to the
 *    browser).
 *
 * Region order is read from the rendered DOM (see {@link $orderedRegions}), and
 * the edge checks reuse {@link $isAtStartOfNode} / {@link $isAtEndOfNode} so a
 * mid-region caret — including between the visual lines of a wrapped text node —
 * defers to the browser.
 */
export function registerSlotHostArrowEscape<T extends LexicalNode>(
  editor: LexicalEditor,
  $isHost: (node: LexicalNode | null | undefined) => node is T,
): () => void {
  return mergeRegister(
    editor.registerCommand(
      KEY_ARROW_DOWN_COMMAND,
      event => $handleSlotHostArrow(editor, $isHost, event, true),
      COMMAND_PRIORITY_LOW,
    ),
    editor.registerCommand(
      KEY_ARROW_UP_COMMAND,
      event => $handleSlotHostArrow(editor, $isHost, event, false),
      COMMAND_PRIORITY_LOW,
    ),
  );
}

/**
 * Whether a slot host has no text in its children or in any of its named slots —
 * the baseline "empty" test {@link registerSlotHostBackspace} deletes on. A
 * host with other meaningful state (e.g. the Review's rating) composes an extra
 * check on top of this.
 */
export function $isSlotHostTextEmpty(host: LexicalNode): boolean {
  if ($isElementNode(host) && host.getTextContentSize() !== 0) {
    return false;
  }
  for (const name of $getSlotNames(host)) {
    const value = $getSlot(host, name);
    if ($isElementNode(value) && value.getTextContentSize() !== 0) {
      return false;
    }
  }
  return true;
}

// Remove an empty host and put the caret where it was: at the end of the
// previous block, else the start of the next, else in a fresh paragraph that
// replaces it (the document always needs at least one block).
function $deleteEmptyHost(host: LexicalNode): void {
  const prev = host.getPreviousSibling();
  if ($isElementNode(prev)) {
    host.remove();
    prev.selectEnd();
    return;
  }
  const next = host.getNextSibling();
  if ($isElementNode(next)) {
    host.remove();
    next.selectStart();
    return;
  }
  host.replace($createParagraphNode()).selectStart();
}

// A non-collapsed selection whose start sits at a host's content start and whose
// end is outside the host — e.g. a document-wide select-all of a first-block
// host — only clears the host's contents on delete, leaving the (now empty)
// shell, because the start point is *inside* the host. Move that start point to
// just before the host in its parent so the host itself falls in the deleted
// range and the default delete replaces the whole node with a paragraph. The
// adjusted selection is left for the default delete handler (the caller returns
// false). `$isAtStartOfNode` reads the host's first *navigable* descendant, which
// skips slots, so both the Review (body first) and the Card (title slot first in
// DOM, but body first in navigation) match; a slot-scoped or partial selection
// whose end stays inside the host is left untouched.
function $reanchorRangeBeforeHost<T extends LexicalNode>(
  selection: RangeSelection,
  $isHost: (node: LexicalNode | null | undefined) => node is T,
): void {
  const backward = selection.isBackward();
  const start = backward ? selection.focus : selection.anchor;
  const end = backward ? selection.anchor : selection.focus;
  const host = $findSlotHost(start.getNode(), $isHost);
  if (host === null || $findSlotHost(end.getNode(), $isHost) === host) {
    return;
  }
  const parent = host.getParent();
  if (
    parent !== null &&
    $isElementNode(host) &&
    $isAtStartOfNode(start, host)
  ) {
    start.set(parent.getKey(), host.getIndexWithinParent(), 'element');
  }
}

/**
 * Delete a slot host from a range or its edges:
 *
 * - A non-collapsed selection that starts at the host's content and extends out
 *   of it (a select-all of a first-block host) replaces the whole host with a
 *   paragraph rather than only clearing its contents (see
 *   {@link $reanchorRangeBeforeHost}) — on both Backspace and forward Delete.
 * - On Backspace, a collapsed caret at the start of an *empty* host's first
 *   region (the Card's `title` slot, the Review's body) escapes the host by
 *   deleting it — the analog of backspacing an empty block away.
 *
 * A non-empty host is otherwise left to the default handler, so the slots'
 * shadow-root boundary still protects their content (backspace at a non-empty
 * slot start stays a no-op). Backspace at the start of a block *after* an
 * empty host is also left alone: the user's caret is in the next block, so
 * silently deleting the previous host crosses a node boundary the user did
 * not point at (issue #8712).
 */
export function registerSlotHostBackspace<T extends LexicalNode>(
  editor: LexicalEditor,
  $isHost: (node: LexicalNode | null | undefined) => node is T,
  $isEmpty: (host: T) => boolean,
): () => void {
  return mergeRegister(
    editor.registerCommand(
      KEY_BACKSPACE_COMMAND,
      event => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return false;
        }
        if (!selection.isCollapsed()) {
          $reanchorRangeBeforeHost(selection, $isHost);
          return false;
        }
        const anchor = selection.anchor;
        const inner = $findSlotHost(anchor.getNode(), $isHost);
        if (inner === null) {
          // Caret is outside the host. Let the default handler take it; we
          // do not silently delete the previous empty host, which would
          // cross a node boundary the user did not point at.
          return false;
        }
        // Inside the host: only delete from the start of its first region.
        const first = $orderedRegions(editor, inner)[0];
        if (
          first !== undefined &&
          $isElementNode(first.startNode) &&
          $isAtStartOfNode(anchor, first.startNode) &&
          $isEmpty(inner)
        ) {
          $deleteEmptyHost(inner);
          if (event) {
            event.preventDefault();
          }
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_BEFORE_EDITOR,
    ),
    // Forward delete: a select-all spanning a first-block host should replace it
    // with a paragraph too. The empty-host edge cases above stay backspace-only
    // (forward-delete at a start deletes into the content, not the box).
    editor.registerCommand(
      KEY_DELETE_COMMAND,
      () => {
        const selection = $getSelection();
        if ($isRangeSelection(selection) && !selection.isCollapsed()) {
          $reanchorRangeBeforeHost(selection, $isHost);
        }
        return false;
      },
      COMMAND_PRIORITY_BEFORE_EDITOR,
    ),
  );
}

/**
 * Insert a slot host at the nearest root for an INSERT_* command. Same as
 * `$insertNodeToNearestRoot`, but drops the empty paragraph it leaves *before*
 * the host: `$insertNodeToNearestRoot` splits the current block, so inserting
 * from an otherwise-empty paragraph (the `/command` flow) seeds a stray blank
 * line above the host. ArrowUp escape re-creates one on demand, so it is not
 * needed up front; the trailing paragraph (where the caret lands) is kept.
 */
export function $insertSlotHostAtRoot<T extends LexicalNode>(node: T): T {
  $insertNodeToNearestRoot(node);
  const before = node.getPreviousSibling();
  if ($isParagraphNode(before) && before.getTextContentSize() === 0) {
    before.remove();
  }
  return node.getLatest();
}
