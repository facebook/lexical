/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  LexicalNode,
  NodeKey,
  SlotChildNode,
  SlotHostNode,
} from './LexicalNode';
import type {DecoratorNode} from './nodes/LexicalDecoratorNode';
import type {ElementNode} from './nodes/LexicalElementNode';

import invariant from '@lexical/internal/invariant';

import {$getEditor, $getNodeByKey, $isDecoratorNode, $isElementNode} from '.';
import {$removeFromParent} from './LexicalUtils';

/**
 * Shared empty slot map. Reads coalesce here when a host's `__slots` is null
 * (lazy allocation), so non-slot trees don't pay a per-node allocation cost.
 *
 * @internal
 */
export const EMPTY_SLOTS: ReadonlyMap<string, NodeKey> = new Map();

/**
 * True when `node` can host named slots — i.e. it is an {@link ElementNode} or
 * a {@link DecoratorNode}. Narrows to {@link SlotHostNode} so the mutation
 * helpers' compile-time host requirement is satisfied.
 *
 * @experimental
 */
export function $isSlotHost(
  node: LexicalNode,
): node is LexicalNode & SlotHostNode {
  return $isElementNode(node) || $isDecoratorNode(node);
}

/**
 * True when `node` can occupy a named slot — i.e. it is an {@link ElementNode}
 * or a {@link DecoratorNode}. Narrows to {@link SlotChildNode}.
 *
 * @experimental
 */
export function $isSlotChild(
  node: LexicalNode,
): node is LexicalNode & SlotChildNode {
  return $isElementNode(node) || $isDecoratorNode(node);
}

/**
 * Returns the key of the host this node is slotted into, or null when the node
 * is not slotted. Accepts any node and narrows internally so generic callers
 * (removal guard, up-walk, GC, caret) don't have to. Exposes a raw key, so it
 * stays internal to the package; public callers use {@link $getSlotHost}.
 *
 * @internal
 */
export function $getSlotHostKey(node: LexicalNode): null | NodeKey {
  const latest = node.getLatest();
  return $isSlotChild(latest) ? latest.__slotHost : null;
}

/**
 * Returns the host element when this node occupies one of its named slots,
 * or null if this node is not slotted. The up-link is kept separate from
 * {@link LexicalNode.getParent} so the slot boundary behaves like a shadow
 * root.
 *
 * @experimental
 */
export function $getSlotHost(
  node: LexicalNode,
): ElementNode | DecoratorNode<unknown> | null {
  const slotHostKey = $getSlotHostKey(node);
  if (slotHostKey === null) {
    return null;
  }
  const host = $getNodeByKey(slotHostKey);
  invariant(
    $isElementNode(host) || $isDecoratorNode(host),
    'slotHost must be an ElementNode or a DecoratorNode',
  );
  return host;
}

/**
 * Returns the latest slot map (name -> child key, insertion order). Exposes raw
 * keys, so it stays internal to the package; public callers use
 * {@link $getSlotNames} / {@link $getSlot}.
 *
 * @internal
 */
export function $getSlotMap(node: LexicalNode): ReadonlyMap<string, NodeKey> {
  const latest = node.getLatest();
  return $isSlotHost(latest) && latest.__slots !== null
    ? latest.__slots
    : EMPTY_SLOTS;
}

/**
 * Returns the names of this node's occupied slots, in insertion order. Empty
 * when the node hosts no slots.
 *
 * @experimental
 */
export function $getSlotNames(node: LexicalNode): string[] {
  return Array.from($getSlotMap(node).keys());
}

/**
 * Returns the node occupying the named slot, or null if the slot is empty.
 * Slots are a shadow-root-isolated channel kept separate from children; see
 * {@link $getSlotHost} for the reverse up-link.
 *
 * @experimental
 */
export function $getSlot<T extends LexicalNode>(
  node: LexicalNode,
  name: string,
): T | null {
  const key = $getSlotMap(node).get(name);
  return key === undefined ? null : $getNodeByKey<T>(key);
}

/**
 * Places `node` into the named slot of `host`, replacing any existing value
 * under that name. A slot value must be a shadow-root {@link ElementNode} or a
 * non-inline {@link DecoratorNode}. If `node` is currently a child of another
 * element it is detached first; it must not already be slotted elsewhere — a
 * slotted node and a child are mutually exclusive. The replaced value, if any,
 * is detached. `host` is constrained to {@link SlotHostNode} so a non-host is
 * rejected at compile time.
 *
 * @experimental
 */
export function $setSlot<T extends LexicalNode & SlotHostNode>(
  host: T,
  name: string,
  node: LexicalNode,
): T {
  invariant(
    name !== '__proto__' && name !== 'constructor' && name !== 'prototype',
    'setSlot: "%s" is a reserved slot name; __proto__, constructor, and prototype break the plain-object serialization of slots',
    name,
  );
  invariant(
    ($isElementNode(node) && node.isShadowRoot()) ||
      ($isDecoratorNode(node) && !node.isInline()),
    'setSlot: node %s is not a valid slot value; a slot must be a shadow-root ElementNode or a non-inline DecoratorNode.',
    node.__key,
  );
  invariant(
    !$isSlotAncestorOrSelf(node, host),
    'setSlot: node %s cannot be slotted into %s; a node may not host itself or an ancestor reached through children or slot up-links — the slot up-link would form a cycle that loops isAttached/GC.',
    node.__key,
    host.__key,
  );
  invariant(
    $getSlotHostKey(node) === null,
    'setSlot: node %s is already slotted into host %s; remove it from its current slot first.',
    node.__key,
    String($getSlotHostKey(node)),
  );
  const writableSelf = host.getWritable();
  if (writableSelf.__slots === null) {
    writableSelf.__slots = new Map();
  }
  const previousKey = writableSelf.__slots.get(name);
  if (previousKey !== undefined) {
    $detachSlottedNode(previousKey);
  }
  const writableNode = node.getWritable();
  // $removeFromParent (not node.remove()) so the host survives even when it
  // would otherwise cascade on becoming empty (e.g. a third-party host with
  // canBeEmpty()=false whose single shadow-root child is being slotted in).
  // Mirrors the patterns in ElementNode.append / replace / insertBefore.
  $removeFromParent(writableNode);
  writableNode.__slotHost = writableSelf.__key;
  writableSelf.__slots.set(name, writableNode.__key);
  $getEditor()._slotsUsed = true;
  return writableSelf;
}

/**
 * Removes the named slot from `host`, detaching its value (its slot up-link is
 * cleared). No-op if the slot is empty. `host` is constrained to
 * {@link SlotHostNode} so a non-host is rejected at compile time.
 *
 * @experimental
 */
export function $removeSlot<T extends LexicalNode & SlotHostNode>(
  host: T,
  name: string,
): T {
  const writableSelf = host.getWritable();
  if (writableSelf.__slots === null) {
    return writableSelf;
  }
  const previousKey = writableSelf.__slots.get(name);
  if (previousKey !== undefined) {
    $detachSlottedNode(previousKey);
    writableSelf.__slots.delete(name);
  }
  return writableSelf;
}

// @experimental named-slots. True when `node` is `host` itself or any ancestor
// of `host` reachable by walking up the combined parent/slot up-link chain (the
// same traversal isAttached uses). isParentOf only follows __parent, so it can't
// see a host that sits above `node` through slot up-links; slotting `node` there
// would close a cycle that loops isAttached/GC.
function $isSlotAncestorOrSelf(node: LexicalNode, host: LexicalNode): boolean {
  let key: NodeKey | null = host.__key;
  while (key !== null) {
    if (key === node.__key) {
      return true;
    }
    const current: LexicalNode | null = $getNodeByKey(key);
    if (current === null) {
      break;
    }
    key =
      current.__parent !== null ? current.__parent : $getSlotHostKey(current);
  }
  return false;
}

// @experimental named-slots. Detaches the node currently slotted under a key,
// clearing its slot up-link before remove() so it isn't reprocessed as a
// still-slotted node. Shared by $setSlot (replacing an occupant) and
// $removeSlot.
function $detachSlottedNode(slotKey: NodeKey): void {
  const previous = $getNodeByKey(slotKey);
  if (previous === null) {
    return;
  }
  const writablePrevious = previous.getWritable();
  invariant(
    $isSlotChild(writablePrevious),
    'detach: slotted node %s must be an ElementNode or a DecoratorNode',
    slotKey,
  );
  writablePrevious.__slotHost = null;
  writablePrevious.remove();
}
