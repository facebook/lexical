/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/*
 * Implementation notes, in no particular order.
 *
 * Sibling text nodes are synced to a single XmlText type. All non-text nodes are synced one-to-one
 * with an XmlElement.
 *
 * To be space-efficient, only property values that differ from their defaults are synced. Default
 * values are determined by creating an instance of the node with no constructor arguments and
 * enumerating over its properties.
 *
 * For a given text node, we make use of XmlText.applyDelta() to sync properties and state to
 * specific ranges of text. Refer to TextAttributes below for the structure of the attributes.
 *
 * For non-text nodes, we use the XmlElement's attributes (YMap under the hood) to sync properties
 * and state. The former are stored using their names as keys, and the latter are stored with a
 * prefix. (NB: '$' couldn't be used as the prefix because it breaks XmlElement.toDOM().)
 */

import type {BindingV2} from './Bindings';

import invariant from '@lexical/internal/invariant';
import {
  $getSelection,
  $getSlot,
  $getSlotNames,
  $getWritableNodeState,
  $isDecoratorNode,
  $isRangeSelection,
  $isTextNode,
  $removeSlot,
  $setSlot,
  ElementNode,
  getDeclaredSlots,
  type LexicalNode,
  type NodeKey,
  RootNode,
  TextNode,
} from 'lexical';
import {
  ContentFormat,
  ContentString,
  type Doc as YDoc,
  type ID,
  isDeleted,
  type Item,
  Map as YMap,
  Snapshot,
  type Text as YText,
  typeListToArraySnapshot,
  typeMapGetAllSnapshot,
  XmlElement,
  XmlHook,
  XmlText,
} from 'yjs';

import simpleDiffWithCursor from './simpleDiffWithCursor';
import {
  $isSlotValueNode,
  $syncPropertiesFromYjs,
  getDefaultNodeProperties,
  hasUnregisteredNodeTypes,
  isOpaqueNodeType,
  isReservedSlotName,
  ROOT_NODE_NAME,
  setSlotsAttr,
  SLOTS_ATTR_KEY,
} from './Utils';

type ComputeYChange = (
  event: 'removed' | 'added',
  id: ID,
) => Record<string, unknown>;

type TextAttributes = {
  t?: string; // type if not TextNode
  p?: Record<string, unknown>; // properties
  [key: `s_${string}`]: unknown; // state
  i?: number; // used to prevent Yjs from merging text nodes itself
  ychange?: Record<string, unknown>;
};

const isRootElement = (el: XmlElement): boolean =>
  el.nodeName === ROOT_NODE_NAME;

// Whether visible text in the run has a TextNode type (`t`) this editor does
// not register. Walks the run's items like toDelta, without building it.
const hasUnregisteredTextType = (
  binding: BindingV2,
  text: XmlText,
): boolean => {
  let type: unknown = null;
  for (let n = text._start; n !== null; n = n.right) {
    if (n.deleted) {
      continue;
    } else if (n.content instanceof ContentFormat) {
      if (n.content.key === 't') {
        type = n.content.value;
      }
    } else if (
      n.countable &&
      typeof type === 'string' &&
      isOpaqueNodeType(binding, type)
    ) {
      return true;
    }
  }
  return false;
};

// Whether a known element holds content this editor cannot show (an
// unregistered element, or text of an unregistered TextNode type) together
// with text. Skipping only that content would leave the text around it
// adjacent in Lexical, where it is joined and then written back as one run,
// moving text across the hidden content.
const hasOpaqueContentAmongText = (
  binding: BindingV2,
  el: XmlElement,
): boolean => {
  let hasText = false;
  let hasOpaqueChild = false;
  for (const child of el.toArray()) {
    if (child instanceof XmlText) {
      hasText = true;
      if (!hasOpaqueChild && hasUnregisteredTextType(binding, child)) {
        hasOpaqueChild = true;
      }
    } else if (
      child instanceof XmlElement &&
      isOpaqueNodeType(binding, child.nodeName)
    ) {
      hasOpaqueChild = true;
    }
  }
  return hasText && hasOpaqueChild;
};

// The result of hasOpaqueContentAmongText per binding and element. It depends
// only on the element's own children and their text formats, which only a
// remote change can turn opaque (this editor cannot create a type it does not
// register), so it is computed when an element is first read from Yjs and
// refreshed when a remote change reaches that element ($syncOpaqueChange).
let opaqueContentCache:
  | WeakMap<BindingV2, WeakMap<XmlElement, boolean>>
  | undefined;

const hasOpaqueContentCached = (
  binding: BindingV2,
  el: XmlElement,
  refresh: boolean,
): boolean => {
  if (opaqueContentCache === undefined) {
    opaqueContentCache = new WeakMap();
  }
  let cache = opaqueContentCache.get(binding);
  if (cache === undefined) {
    cache = new WeakMap();
    opaqueContentCache.set(binding, cache);
  }
  let result = refresh ? undefined : cache.get(el);
  if (result === undefined) {
    if (!refresh && binding.mapping.get(el) !== undefined) {
      // Created by this editor, so it holds only registered types.
      return false;
    }
    result = hasOpaqueContentAmongText(binding, el);
    cache.set(el, result);
  }
  return result;
};

/**
 * An element is "opaque" when its node type is not registered on this editor
 * (it was written by a collaborator with more node classes, e.g. during the
 * rollout of a new node type), or when it holds such content among text (see
 * hasOpaqueContentAmongText). It is never materialized into Lexical, and the
 * Lexical -> Yjs diff only looks at the visible children around it, so this
 * editor never deletes, rewrites, or reorders it. Changes inside it stay in
 * Yjs only.
 */
const isOpaqueYType = (
  binding: BindingV2,
  t: unknown,
  refresh: boolean = false,
): boolean =>
  t instanceof XmlElement &&
  !isRootElement(t) &&
  (isOpaqueNodeType(binding, t.nodeName) ||
    hasOpaqueContentCached(binding, t, refresh));

const getParentElement = (
  t: XmlElement | XmlText | YMap<unknown>,
): XmlElement | null => {
  // A slot value's parent is its host's `__slots` map.
  const parent = t.parent instanceof YMap ? t.parent.parent : t.parent;
  return parent instanceof XmlElement ? parent : null;
};

// Re-syncs the Lexical node of el's parent (or slot host), which drops or
// creates el's Lexical node.
const $syncParentOf = (binding: BindingV2, el: XmlElement): void => {
  const isSlotValue = el.parent instanceof YMap;
  const parent = getParentElement(el);
  if (parent !== null) {
    $createOrUpdateNodeFromYElement(
      parent,
      binding,
      new Set(isSlotValue ? [SLOTS_ATTR_KEY] : []),
      !isSlotValue,
    );
  }
};

/**
 * Handles a remote change to `el` (the element whose children, attributes, or
 * text changed) for content this editor cannot show. Returns whether the
 * change needs no further handling: it is inside opaque content, or it made
 * `el` start or stop being opaque, which re-syncs the parent instead.
 */
export const $syncOpaqueChange = (
  binding: BindingV2,
  el: XmlElement,
): boolean => {
  // Only el's own children changed, so only its cached result is stale.
  let opaque = isOpaqueYType(binding, el, true) ? el : null;
  for (let cur = getParentElement(el); cur !== null && cur !== binding.root; ) {
    if (isOpaqueYType(binding, cur)) {
      opaque = cur;
    }
    cur = getParentElement(cur);
  }
  if (opaque !== null) {
    if (binding.mapping.get(opaque) !== undefined) {
      // Shown until now.
      $syncParentOf(binding, opaque);
    }
    return true;
  }
  if (el !== binding.root && hasUnregisteredNodeTypes(binding)) {
    // Hidden until now: the outermost element without a Lexical node is the
    // one to create.
    let hidden: XmlElement | null = null;
    for (
      let cur: XmlElement | null = el;
      cur !== null && cur !== binding.root;
      cur = getParentElement(cur)
    ) {
      if (binding.mapping.get(cur) === undefined) {
        hidden = cur;
      }
    }
    if (hidden !== null) {
      $syncParentOf(binding, hidden);
      return true;
    }
  }
  return false;
};

type YChild = XmlElement | XmlText | XmlHook;

// The children the Lexical tree mirrors, with their indices in `el`.
const visibleChildren = (
  binding: BindingV2,
  el: XmlElement,
): {children: YChild[]; indices: number[]} => {
  const all = el.toArray() as YChild[];
  const children: YChild[] = [];
  const indices: number[] = [];
  for (let i = 0; i < all.length; i++) {
    if (!isOpaqueYType(binding, all[i])) {
      children.push(all[i]);
      indices.push(i);
    }
  }
  return {children, indices};
};

export const $createOrUpdateNodeFromYElement = (
  el: XmlElement,
  binding: BindingV2,
  keysChanged: Set<string> | null,
  childListChanged: boolean,
  snapshot?: Snapshot,
  prevSnapshot?: Snapshot,
  computeYChange?: ComputeYChange,
): LexicalNode | null => {
  if (isOpaqueYType(binding, el)) {
    // Left in Yjs, untouched, and skipped.
    if (binding.mapping.get(el) !== undefined) {
      // It was shown until now.
      $deleteMappingForSubtree(el, binding);
    }
    return null;
  }
  let node = binding.mapping.get(el);
  if (node && keysChanged && keysChanged.size === 0 && !childListChanged) {
    return node;
  }

  const type = isRootElement(el) ? RootNode.getType() : el.nodeName;
  const registeredNodes = binding.editor._nodes;
  const nodeInfo = registeredNodes.get(type);
  if (nodeInfo === undefined) {
    throw new Error(
      `$createOrUpdateNodeFromYElement: Node ${type} is not registered`,
    );
  }

  if (!node) {
    node = new nodeInfo.klass();
    keysChanged = null;
    childListChanged = true;
  }

  if (childListChanged && node instanceof ElementNode) {
    const children: LexicalNode[] = [];
    const $createChildren = (childType: XmlElement | XmlText | XmlHook) => {
      if (childType instanceof XmlElement) {
        const n = $createOrUpdateNodeFromYElement(
          childType,
          binding,
          new Set(),
          false,
          snapshot,
          prevSnapshot,
          computeYChange,
        );
        if (n !== null) {
          children.push(n);
        }
      } else if (childType instanceof XmlText) {
        const ns = $createOrUpdateTextNodesFromYText(
          childType,
          binding,
          snapshot,
          prevSnapshot,
          computeYChange,
        );
        if (ns !== null) {
          ns.forEach(textchild => {
            if (textchild !== null) {
              children.push(textchild);
            }
          });
        }
      } else {
        invariant(false, 'XmlHook is not supported');
      }
    };

    if (snapshot === undefined || prevSnapshot === undefined) {
      el.toArray().forEach($createChildren);
    } else {
      typeListToArraySnapshot(el, new Snapshot(prevSnapshot.ds, snapshot.sv))
        .filter(
          childType =>
            !childType._item.deleted ||
            isItemVisible(childType._item, snapshot) ||
            isItemVisible(childType._item, prevSnapshot),
        )
        .forEach($createChildren);
    }

    $spliceChildren(node, children);
  }

  // TODO(collab-v2): typing for XmlElement generic
  const attrs = el.getAttributes(snapshot) as Record<string, unknown>;
  if (!isRootElement(el) && snapshot !== undefined) {
    if (!isItemVisible(el._item!, snapshot)) {
      attrs[stateKeyToAttrKey('ychange')] = computeYChange
        ? computeYChange('removed', el._item!.id)
        : {type: 'removed'};
    } else if (!isItemVisible(el._item!, prevSnapshot)) {
      attrs[stateKeyToAttrKey('ychange')] = computeYChange
        ? computeYChange('added', el._item!.id)
        : {type: 'added'};
    }
  }
  const properties: Record<string, unknown> = {
    ...getDefaultNodeProperties(node, binding),
  };
  const state: Record<string, unknown> = {};
  for (const k in attrs) {
    if (k.startsWith(STATE_KEY_PREFIX)) {
      // State keys route through NodeState.updateFromJSON, which guards
      // against prototype-polluting keys.
      state[attrKeyToStateKey(k)] = attrs[k];
    } else if (
      k !== SLOTS_ATTR_KEY &&
      k !== '__proto__' &&
      k !== 'constructor' &&
      k !== 'prototype'
    ) {
      // Skip prototype-polluting property keys from untrusted remote attrs.
      // SLOTS_ATTR_KEY is a dedicated channel restored below, not a node property.
      properties[k] = attrs[k];
    }
  }

  $syncPropertiesFromYjs(binding, properties, node, keysChanged);
  if (!keysChanged) {
    $getWritableNodeState(node).updateFromJSON(state);
  } else if (keysChanged.size > 0) {
    const writableState = $getWritableNodeState(node);
    for (const changedKey of keysChanged) {
      if (changedKey.startsWith(STATE_KEY_PREFIX)) {
        const stateKey = attrKeyToStateKey(changedKey);
        writableState.updateFromUnknown(stateKey, state[stateKey]);
      }
    }
  }

  // Reconcile the dedicated `__slots` channel against the host's `__slots` Y.Map.
  // Diff (not blind $setSlot) so unchanged entries don't churn writables on
  // every remote reconcile ($setSlot has move semantics, so a re-set is safe
  // but not free). A
  // host is an ElementNode or a non-inline DecoratorNode; both store slots as a
  // `__slots` Y.Map attribute, and the reconcile only uses base-node slot methods.
  if (node instanceof ElementNode || $isDecoratorNode(node)) {
    // SLOTS_ATTR_KEY is stored as a Y.Map attribute; `attrs` widens it to unknown so
    // instanceof can narrow it back, and is already snapshot-aware, so a
    // historical render sees the membership the snapshot had.
    const slotsY = attrs[SLOTS_ATTR_KEY];
    const yNames = new Set<string>();
    if (slotsY instanceof YMap) {
      // The Y.Map's entries live in its own item chain, not the host's, so
      // the snapshot read needs typeMapGetAllSnapshot (entries() is live).
      const slotEntries: [string, unknown][] =
        snapshot === undefined
          ? Array.from(slotsY.entries())
          : Object.entries(typeMapGetAllSnapshot(slotsY, snapshot));
      for (const [name, slotType] of slotEntries) {
        if (isOpaqueYType(binding, slotType)) {
          // Stays in Yjs only. Leaving the name out of yNames drops a stale
          // local occupant, so the next local edit cannot write it back.
          continue;
        }
        yNames.add(name);
        // Names and values are peer-controlled. An entry that would trip
        // $setSlot's invariants is skipped as a silent no-op (the local doc
        // simply doesn't reflect it) instead of crashing the observer
        // editor.update.
        if (isReservedSlotName(name)) {
          continue;
        }
        let slotNode: LexicalNode | null = null;
        if (slotType instanceof XmlElement) {
          slotNode = $createOrUpdateNodeFromYElement(
            slotType,
            binding,
            new Set(),
            false,
            snapshot,
            prevSnapshot,
            computeYChange,
          );
        }
        if (slotNode === null) {
          continue;
        }
        // Same node already occupies this slot -> its content was updated in
        // place by the calls above, so skip $setSlot (which would re-fire its
        // invariant). A different (or absent) key means a fresh/replaced node;
        // $setSlot detaches the previous occupant.
        const existingSlot = $getSlot(node, name);
        if (
          existingSlot !== null &&
          existingSlot.getKey() === slotNode.getKey()
        ) {
          continue;
        }
        if (!$isSlotValueNode(slotNode)) {
          // A node materialized only for this rejected entry is dropped from
          // the mapping (it stays unattached and lexical GCs it, so a stale
          // entry would later dereference a dead node); an attached node
          // legitimately mapped elsewhere keeps its mapping.
          if (!slotNode.isAttached()) {
            $deleteMappingForSubtree(slotType as XmlElement, binding);
          }
          continue;
        }
        if (slotNode.getLatest().__slotHost !== null) {
          // Already slotted: the same shared type under two names. First name
          // wins; later aliases are skipped.
          continue;
        }
        $setSlot(node, name, slotNode);
      }
    }
    // Drop slots that no longer exist in yjs. getSlotNames returns a snapshot
    // array, so mutating __slots via $removeSlot during iteration is safe.
    for (const name of $getSlotNames(node)) {
      if (!yNames.has(name)) {
        $removeSlot(node, name);
      }
    }
  }

  const latestNode = node.getLatest();
  binding.mapping.set(el, latestNode);
  return latestNode;
};

const $spliceChildren = (node: ElementNode, nextChildren: LexicalNode[]) => {
  const prevChildren = node.getChildren();
  const prevChildrenKeySet = new Set(prevChildren.map(child => child.getKey()));
  const nextChildrenKeySet = new Set(nextChildren.map(child => child.getKey()));

  const prevEndIndex = prevChildren.length - 1;
  const nextEndIndex = nextChildren.length - 1;
  let prevIndex = 0;
  let nextIndex = 0;

  while (prevIndex <= prevEndIndex && nextIndex <= nextEndIndex) {
    const prevKey = prevChildren[prevIndex].getKey();
    const nextKey = nextChildren[nextIndex].getKey();

    if (prevKey === nextKey) {
      prevIndex++;
      nextIndex++;
      continue;
    }

    const nextHasPrevKey = nextChildrenKeySet.has(prevKey);
    const prevHasNextKey = prevChildrenKeySet.has(nextKey);

    if (!nextHasPrevKey) {
      // If removing the last node, insert remaining new nodes immediately, otherwise if the node
      // cannot be empty, it will remove itself from its parent.
      if (nextIndex === 0 && node.getChildrenSize() === 1) {
        node.splice(nextIndex, 1, nextChildren.slice(nextIndex));
        return;
      }
      // Remove
      node.splice(nextIndex, 1, []);
      prevIndex++;
      continue;
    }

    // Create or replace
    const nextChildNode = nextChildren[nextIndex];
    if (prevHasNextKey) {
      node.splice(nextIndex, 1, [nextChildNode]);
      prevIndex++;
      nextIndex++;
    } else {
      node.splice(nextIndex, 0, [nextChildNode]);
      nextIndex++;
    }
  }

  const appendNewChildren = prevIndex > prevEndIndex;
  const removeOldChildren = nextIndex > nextEndIndex;

  if (appendNewChildren && !removeOldChildren) {
    node.append(...nextChildren.slice(nextIndex));
  } else if (removeOldChildren && !appendNewChildren) {
    node.splice(
      nextChildren.length,
      node.getChildrenSize() - nextChildren.length,
      [],
    );
  }
};

const isItemVisible = (item: Item, snapshot?: Snapshot): boolean =>
  snapshot === undefined
    ? !item.deleted
    : snapshot.sv.has(item.id.client) &&
      snapshot.sv.get(item.id.client)! > item.id.clock &&
      !isDeleted(snapshot.ds, item.id);

const $createOrUpdateTextNodesFromYText = (
  text: XmlText,
  binding: BindingV2,
  snapshot?: Snapshot,
  prevSnapshot?: Snapshot,
  computeYChange?: ComputeYChange,
): TextNode[] | null => {
  const deltas = toDelta(text, snapshot, prevSnapshot, computeYChange);

  // Use existing text nodes if the count and types all align, otherwise throw out the existing
  // nodes and create new ones.
  let nodes: TextNode[] = binding.mapping.get(text) ?? [];

  const nodeTypes: string[] = deltas.map(
    delta => delta.attributes.t ?? TextNode.getType(),
  );
  const registeredNodes = binding.editor._nodes;
  const unregisteredType = nodeTypes.find(type => !registeredNodes.has(type));
  if (
    unregisteredType !== undefined &&
    isOpaqueNodeType(binding, unregisteredType)
  ) {
    // Its element is normally skipped before this point
    // (hasOpaqueContentAmongText). Skip the run rather than throw if not.
    binding.mapping.delete(text);
    return null;
  }
  const canReuseNodes =
    nodes.length === nodeTypes.length &&
    nodes.every((node, i) => node.getType() === nodeTypes[i]);
  if (!canReuseNodes) {
    nodes = nodeTypes.map(type => {
      const nodeInfo = registeredNodes.get(type);
      if (nodeInfo === undefined) {
        throw new Error(
          `$createTextNodesFromYText: Node ${type} is not registered`,
        );
      }
      const node = new nodeInfo.klass();
      if (!$isTextNode(node)) {
        throw new Error(
          `$createTextNodesFromYText: Node ${type} is not a TextNode`,
        );
      }
      return node;
    });
  }

  // Sync text, properties and state to the text nodes.
  for (let i = 0; i < deltas.length; i++) {
    const node = nodes[i];
    const delta = deltas[i];
    const {attributes, insert} = delta;
    if (node.__text !== insert) {
      node.setTextContent(insert);
    }
    const properties = {
      ...getDefaultNodeProperties(node, binding),
      ...attributes.p,
    };
    const state = Object.fromEntries(
      Object.entries(attributes)
        .filter(([k]) => k.startsWith(STATE_KEY_PREFIX))
        .map(([k, v]) => [attrKeyToStateKey(k), v]),
    );
    $syncPropertiesFromYjs(binding, properties, node, null);
    $getWritableNodeState(node).updateFromJSON(state);
  }

  const latestNodes = nodes.map(node => node.getLatest());
  binding.mapping.set(text, latestNodes);
  return latestNodes;
};

const $createTypeFromTextNodes = (
  nodes: TextNode[],
  binding: BindingV2,
): XmlText => {
  const type = new XmlText();
  $updateYText(type, nodes, binding);
  return type;
};

// Build a `Y.Map<name, XmlElement>` mirroring the host's `__slots`. Each slot
// root is a non-inline ElementNode or DecoratorNode (enforced by $setSlot), so
// it is serialized through `createTypeFromElementNode` and nested slots fold in
// recursively. Returns undefined for a host with no slots so non-slot hosts
// set no attribute — except that a class declaring its slots gets the (empty)
// Y.Map eagerly at creation, mirroring V1's $seedHostSlots: the map then
// merges with host creation itself, so each name's FIRST set is an
// entry-level Y.Map operation instead of an attribute-level LWW race between
// clients that both create the map.
const $createSlotsYType = (
  node: LexicalNode,
  binding: BindingV2,
): YMap<XmlElement> | undefined => {
  const names = $getSlotNames(node);
  if (names.length === 0 && getDeclaredSlots(node.constructor).length === 0) {
    return undefined;
  }
  const slotsY = new YMap<XmlElement>();
  for (const name of names) {
    const slotNode = $getSlot(node, name);
    if (slotNode == null) {
      continue;
    }
    slotsY.set(name, $createSlotValueType(slotNode, binding));
  }
  return slotsY;
};

// Recursive cleanup of binding.mapping entries for a yjs subtree. When a slot
// is dropped or replaced, only its top-level shared type was deleted from
// binding.mapping; the slot's nested children (text spans, descendant
// elements, nested slots) stayed registered and leaked because the slot's
// Y.Doc parent was already gone, so the yjs delete event never re-fired
// observers down the subtree.
const $deleteMappingForSubtree = (
  type: XmlElement | XmlText | XmlHook,
  binding: BindingV2,
): void => {
  // XmlHook is never registered in binding.mapping (SharedType =
  // XmlElement | XmlText), so only delete for those two.
  if (type instanceof XmlElement || type instanceof XmlText) {
    binding.mapping.delete(type);
  }
  if (type instanceof XmlElement) {
    const slotsY = type.getAttribute(SLOTS_ATTR_KEY) as unknown;
    if (slotsY instanceof YMap) {
      for (const slot of (slotsY as YMap<XmlElement>).values()) {
        $deleteMappingForSubtree(slot, binding);
      }
    }
    for (const child of type.toArray()) {
      $deleteMappingForSubtree(
        child as XmlElement | XmlText | XmlHook,
        binding,
      );
    }
  }
};

// Per-slot diff of the host's `__slots` against its `__slots` Y.Map, applied in
// place during a host update (the lexical->yjs counterpart of the yjs->lexical
// slot reconcile in $createOrUpdateNodeFromYElement). Names gone from lexical
// are deleted; a slot whose node identity is preserved is recursed via
// $updateYFragment only when dirty (so in-slot edits propagate while unchanged
// slots keep their yjs IDs instead of being recreated); a new or replaced slot
// is (re)created. The creation-time path (createTypeFromElementNode) still seeds
// slots for a freshly inserted host.
const $updateSlotsYType = (
  yDomFragment: XmlElement,
  node: LexicalNode,
  binding: BindingV2,
  dirtyElements: Set<NodeKey>,
  y: YDoc,
): void => {
  const names = $getSlotNames(node);
  const existing = yDomFragment.getAttribute(SLOTS_ATTR_KEY) as unknown;

  // Removing the last slot empties the Y.Map but keeps the attribute
  // (mirrors V1): removing it would re-open the first-set creation race for
  // the next add and destroy concurrent adds. $equalSlots treats an empty map
  // and an absent attribute alike. A class that declares its slots opts into
  // eager creation — the map is attached even before the first set, so each
  // name's first set merges per-entry instead of racing on attribute LWW.
  if (
    names.length === 0 &&
    !(existing instanceof YMap) &&
    getDeclaredSlots(node.constructor).length === 0
  ) {
    return;
  }

  let slotsY: YMap<XmlElement>;
  if (existing instanceof YMap) {
    slotsY = existing as YMap<XmlElement>;
  } else {
    slotsY = new YMap<XmlElement>();
    setSlotsAttr(yDomFragment, slotsY);
  }

  const nextNames = new Set(names);
  for (const name of Array.from(slotsY.keys())) {
    if (!nextNames.has(name)) {
      const removed = slotsY.get(name);
      if (isOpaqueYType(binding, removed)) {
        // Never shown here, so its absence from Lexical is not a removal.
        continue;
      }
      if (removed !== undefined) {
        $deleteMappingForSubtree(removed, binding);
      }
      slotsY.delete(name);
    }
  }

  for (const name of names) {
    const slotNode = $getSlot(node, name);
    if (slotNode == null) {
      continue;
    }
    const slotY = slotsY.get(name);
    if (
      slotY instanceof XmlElement &&
      (slotNode instanceof ElementNode || $isDecoratorNode(slotNode)) &&
      slotY === binding.mapping.getSharedType(slotNode)
    ) {
      if (dirtyElements.has(slotNode.getKey())) {
        $updateYFragment(y, slotY, slotNode, binding, dirtyElements);
      }
    } else {
      if (slotY instanceof XmlElement) {
        $deleteMappingForSubtree(slotY, binding);
      }
      slotsY.set(name, $createSlotValueType(slotNode, binding));
    }
  }
};

const $createTypeFromElementNode = (
  node: LexicalNode,
  binding: BindingV2,
): XmlElement => {
  const type = new XmlElement(node.getType());
  const attrs = {
    ...propertiesToAttributes(node, binding),
    ...stateToAttributes(node),
  };
  for (const key in attrs) {
    const val = attrs[key];
    if (val !== null) {
      // TODO(collab-v2): typing for XmlElement generic
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type.setAttribute(key, val as any);
    }
  }
  // A non-inline DecoratorNode can host named slots too. It has no children
  // channel, so build only the slots and map the host (so its later in-place
  // slot update can find it). A plain decorator with no slots stays unmapped, as
  // before.
  if (!(node instanceof ElementNode)) {
    const decoratorSlotsY = $createSlotsYType(node, binding);
    if (decoratorSlotsY !== undefined) {
      setSlotsAttr(type, decoratorSlotsY);
      binding.mapping.set(type, node);
    }
    return type;
  }
  const slotsY = $createSlotsYType(node, binding);
  if (slotsY !== undefined) {
    setSlotsAttr(type, slotsY);
  }
  type.insert(
    0,
    normalizeNodeContent(node).map(n =>
      $createTypeFromTextOrElementNode(n, binding),
    ),
  );
  binding.mapping.set(type, node);
  return type;
};

// Slot values are diffed by node identity in $updateSlotsYType, so every slot
// value must be mapped to keep its yjs id across host updates.
// createTypeFromElementNode maps ElementNodes and slot-hosting decorators but
// leaves a plain decorator unmapped (it has nothing to diff in place as a
// child); as a slot value it still needs the mapping, so add it here.
const $createSlotValueType = (
  slotNode: LexicalNode,
  binding: BindingV2,
): XmlElement => {
  const type = $createTypeFromElementNode(slotNode, binding);
  if (
    $isDecoratorNode(slotNode) &&
    binding.mapping.getSharedType(slotNode) === undefined
  ) {
    binding.mapping.set(type, slotNode);
  }
  return type;
};

const $createTypeFromTextOrElementNode = (
  node: LexicalNode | TextNode[],
  meta: BindingV2,
): XmlElement | XmlText =>
  node instanceof Array
    ? $createTypeFromTextNodes(node, meta)
    : $createTypeFromElementNode(node, meta);

const isObject = (
  val: unknown,
): val is Record<string | number | symbol, unknown> =>
  typeof val === 'object' && val != null;

const equalAttrs = (
  pattrs: Record<string | number | symbol, unknown>,
  yattrs: Record<string | number | symbol, unknown> | null,
) => {
  const keys = Object.keys(pattrs).filter(key => pattrs[key] !== null);
  if (yattrs == null) {
    return keys.length === 0;
  }
  let eq =
    keys.length ===
    Object.keys(yattrs).filter(key => yattrs[key] !== null).length;
  for (let i = 0; i < keys.length && eq; i++) {
    const key = keys[i];
    const l = pattrs[key];
    const r = yattrs[key];
    eq =
      key === 'ychange' ||
      l === r ||
      (isObject(l) && isObject(r) && equalAttrs(l, r));
  }
  return eq;
};

type NormalizedPNodeContent = (TextNode[] | LexicalNode)[];

const normalizeNodeContent = (node: LexicalNode): NormalizedPNodeContent => {
  if (!(node instanceof ElementNode)) {
    return [];
  }
  const c = node.getChildren();
  const res: NormalizedPNodeContent = [];
  for (let i = 0; i < c.length; i++) {
    const n = c[i];
    if ($isTextNode(n)) {
      const textNodes: TextNode[] = [];
      for (
        let maybeTextNode = c[i];
        i < c.length && $isTextNode(maybeTextNode);
        maybeTextNode = c[++i]
      ) {
        textNodes.push(maybeTextNode);
      }
      i--;
      res.push(textNodes);
    } else {
      res.push(n);
    }
  }
  return res;
};

const equalYTextLText = (
  ytext: XmlText,
  ltexts: TextNode[],
  binding: BindingV2,
) => {
  const deltas = toDelta(ytext);
  return (
    deltas.length === ltexts.length &&
    deltas.every((d, i) => {
      const ltext = ltexts[i];
      const type = d.attributes.t ?? TextNode.getType();
      const propertyAttrs = d.attributes.p ?? {};
      const stateAttrs = Object.fromEntries(
        Object.entries(d.attributes).filter(([k]) =>
          k.startsWith(STATE_KEY_PREFIX),
        ),
      );
      return (
        d.insert === ltext.getTextContent() &&
        type === ltext.getType() &&
        equalAttrs(propertyAttrs, propertiesToAttributes(ltext, binding)) &&
        equalAttrs(stateAttrs, stateToAttributes(ltext))
      );
    })
  );
};

// Slots half of $equalYTypePNode: the `__slots` attribute is excluded from the
// plain attribute comparison (it is a dedicated channel, not a node property),
// so the equality scan would otherwise repoint the mapping without recursing
// and a slot diff would never be written to yjs. An absent attribute and an
// empty Y.Map are both equal to an empty lexical slot map ($updateSlotsYType
// keeps the map once created). A name whose yjs shared type doesn't map to the
// lexical slot node is reported unequal — a false negative costs a recursion,
// not correctness.
const $equalSlots = (
  ytype: XmlElement,
  lnode: LexicalNode,
  binding: BindingV2,
): boolean => {
  const names = $getSlotNames(lnode);
  const slotsY = ytype.getAttribute(SLOTS_ATTR_KEY) as unknown;
  if (!(slotsY instanceof YMap)) {
    return names.length === 0;
  }
  if (slotsY.size !== names.length) {
    return false;
  }
  for (const name of names) {
    const slotNode = $getSlot(lnode, name);
    const slotY = slotsY.get(name) as unknown;
    if (
      slotNode === null ||
      !(slotY instanceof XmlElement) ||
      binding.mapping.get(slotY) !== slotNode
    ) {
      return false;
    }
  }
  return true;
};

const $equalYTypePNode = (
  ytype: XmlElement | XmlText | XmlHook,
  lnode: LexicalNode | TextNode[],
  binding: BindingV2,
): ytype is XmlElement | XmlText => {
  if (
    ytype instanceof XmlElement &&
    !(lnode instanceof Array) &&
    matchNodeName(ytype, lnode)
  ) {
    const normalizedContent = normalizeNodeContent(lnode);
    // SLOTS_ATTR_KEY is a dedicated channel compared by $equalSlots, never a node
    // property; leaving it in would make every slotted host compare unequal.
    const yattrs = ytype.getAttributes() as Record<string, unknown>;
    delete yattrs[SLOTS_ATTR_KEY];
    if (
      // Opaque children are not compared, so there can be more Y children.
      ytype._length < normalizedContent.length ||
      !equalAttrs(yattrs, {
        ...propertiesToAttributes(lnode, binding),
        ...stateToAttributes(lnode),
      }) ||
      !$equalSlots(ytype, lnode, binding)
    ) {
      return false;
    }
    const yChildren = visibleChildren(binding, ytype).children;
    return (
      yChildren.length === normalizedContent.length &&
      yChildren.every((ychild, i) =>
        $equalYTypePNode(ychild, normalizedContent[i], binding),
      )
    );
  }
  return (
    ytype instanceof XmlText &&
    lnode instanceof Array &&
    equalYTextLText(ytype, lnode, binding)
  );
};

const mappedIdentity = (
  mapped: LexicalNode | TextNode[] | undefined,
  lcontent: LexicalNode | TextNode[],
) =>
  mapped === lcontent ||
  (mapped instanceof Array &&
    lcontent instanceof Array &&
    mapped.length === lcontent.length &&
    mapped.every((a, i) => lcontent[i] === a));

type EqualityFactor = {
  foundMappedChild: boolean;
  equalityFactor: number;
};

const $computeChildEqualityFactor = (
  ytype: XmlElement,
  lnode: LexicalNode,
  binding: BindingV2,
): EqualityFactor => {
  const yChildren = visibleChildren(binding, ytype).children;
  const pChildren = normalizeNodeContent(lnode);
  const pChildCnt = pChildren.length;
  const yChildCnt = yChildren.length;
  const minCnt = Math.min(yChildCnt, pChildCnt);
  let left = 0;
  let right = 0;
  let foundMappedChild = false;
  for (; left < minCnt; left++) {
    const leftY = yChildren[left];
    const leftP = pChildren[left];
    if (leftY instanceof XmlHook) {
      break;
    } else if (mappedIdentity(binding.mapping.get(leftY), leftP)) {
      foundMappedChild = true; // definite (good) match!
    } else if (!$equalYTypePNode(leftY, leftP, binding)) {
      break;
    }
  }
  for (; left + right < minCnt; right++) {
    const rightY = yChildren[yChildCnt - right - 1];
    const rightP = pChildren[pChildCnt - right - 1];
    if (rightY instanceof XmlHook) {
      break;
    } else if (mappedIdentity(binding.mapping.get(rightY), rightP)) {
      foundMappedChild = true;
    } else if (!$equalYTypePNode(rightY, rightP, binding)) {
      break;
    }
  }
  return {
    equalityFactor: left + right,
    foundMappedChild,
  };
};

const ytextTrans = (
  ytext: YText,
): {nAttrs: Record<string, null>; str: string} => {
  let str = '';
  let n = ytext._start;
  const nAttrs: Record<string, null> = {};
  while (n !== null) {
    if (!n.deleted) {
      if (n.countable && n.content instanceof ContentString) {
        str += n.content.str;
      } else if (n.content instanceof ContentFormat) {
        nAttrs[n.content.key] = null;
      }
    }
    n = n.right;
  }
  return {
    nAttrs,
    str,
  };
};

const $updateYText = (
  ytext: XmlText,
  ltexts: TextNode[],
  binding: BindingV2,
) => {
  binding.mapping.set(ytext, ltexts);
  const {nAttrs, str} = ytextTrans(ytext);
  const content = ltexts.map((node, i) => {
    const nodeType = node.getType();
    let p: TextAttributes['p'] | null = propertiesToAttributes(node, binding);
    if (Object.keys(p).length === 0) {
      p = null;
    }
    return {
      attributes: Object.assign({}, nAttrs, {
        ...(nodeType !== TextNode.getType() && {t: nodeType}),
        p,
        ...stateToAttributes(node),
        ...(i > 0 && {i}), // Prevent Yjs from merging text nodes itself.
      }),
      insert: node.getTextContent(),
      nodeKey: node.getKey(),
    };
  });

  const nextText = content.map(c => c.insert).join('');
  const selection = $getSelection();
  let cursorOffset: number;
  if ($isRangeSelection(selection) && selection.isCollapsed()) {
    cursorOffset = 0;
    for (const c of content) {
      if (c.nodeKey === selection.anchor.key) {
        cursorOffset += selection.anchor.offset;
        break;
      }
      cursorOffset += c.insert.length;
    }
  } else {
    cursorOffset = nextText.length;
  }

  const {insert, remove, index} = simpleDiffWithCursor(
    str,
    nextText,
    cursorOffset,
  );
  ytext.delete(index, remove);
  ytext.insert(index, insert);
  ytext.applyDelta(
    content.map(c => ({attributes: c.attributes, retain: c.insert.length})),
  );
};

const toDelta = (
  ytext: YText,
  snapshot?: Snapshot,
  prevSnapshot?: Snapshot,
  computeYChange?: ComputeYChange,
): {insert: string; attributes: TextAttributes}[] => {
  return ytext
    .toDelta(snapshot, prevSnapshot, computeYChange)
    .map((delta: {insert: string; attributes?: TextAttributes}) => {
      const attributes = delta.attributes ?? {};
      if ('ychange' in attributes) {
        attributes[stateKeyToAttrKey('ychange')] = attributes.ychange;
        delete attributes.ychange;
      }
      return {...delta, attributes};
    });
};

const propertiesToAttributes = (node: LexicalNode, meta: BindingV2) => {
  const defaultProperties = getDefaultNodeProperties(node, meta);
  const attrs: Record<string, unknown> = {};
  Object.entries(defaultProperties).forEach(([property, defaultValue]) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (node as any)[property];
    if (value !== defaultValue) {
      attrs[property] = value;
    }
  });
  return attrs;
};

const STATE_KEY_PREFIX = 's_';
const stateKeyToAttrKey = (key: string): `s_${string}` => `s_${key}`;
const attrKeyToStateKey = (key: string) => {
  if (!key.startsWith(STATE_KEY_PREFIX)) {
    throw new Error(`Invalid state key: ${key}`);
  }
  return key.slice(STATE_KEY_PREFIX.length);
};

const stateToAttributes = (node: LexicalNode) => {
  const state = node.__state;
  if (!state) {
    return {};
  }
  const [unknown = {}, known] = state.getInternalState();
  const attrs: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(unknown)) {
    attrs[stateKeyToAttrKey(k)] = v;
  }
  for (const [stateConfig, v] of known) {
    attrs[stateKeyToAttrKey(stateConfig.key)] = stateConfig.unparse(v);
  }
  return attrs;
};

export const $updateYFragment = (
  y: YDoc,
  yDomFragment: XmlElement,
  node: LexicalNode,
  binding: BindingV2,
  dirtyElements: Set<NodeKey>,
) => {
  if (
    yDomFragment instanceof XmlElement &&
    yDomFragment.nodeName !== node.getType() &&
    !(isRootElement(yDomFragment) && node.getType() === RootNode.getType())
  ) {
    throw new Error('node name mismatch!');
  }
  binding.mapping.set(yDomFragment, node);
  // update attributes
  if (yDomFragment instanceof XmlElement) {
    const yDomAttrs = yDomFragment.getAttributes();
    const lexicalAttrs = {
      ...propertiesToAttributes(node, binding),
      ...stateToAttributes(node),
    };
    for (const key in lexicalAttrs) {
      if (lexicalAttrs[key] != null) {
        const isEqual =
          yDomAttrs[key] === lexicalAttrs[key] ||
          // deep equality check so we don't sync properties/state with object values every update
          (isObject(yDomAttrs[key]) &&
            isObject(lexicalAttrs[key]) &&
            equalAttrs(yDomAttrs[key], lexicalAttrs[key]));
        if (!isEqual && key !== 'ychange') {
          // TODO(collab-v2): typing for XmlElement generic
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          yDomFragment.setAttribute(key, lexicalAttrs[key] as any);
        }
      } else {
        yDomFragment.removeAttribute(key);
      }
    }
    // remove all keys that are no longer in pAttrs. The slots channel is set
    // manually below (not in `lexicalAttrs`), so exclude it here or every
    // update would strip it.
    for (const key in yDomAttrs) {
      if (key !== SLOTS_ATTR_KEY && lexicalAttrs[key] === undefined) {
        yDomFragment.removeAttribute(key);
      }
    }
    // @experimental named-slots. Diff the slots channel in place (preserving
    // the yjs IDs of unchanged slots) rather than rebuilding it wholesale. A
    // non-inline DecoratorNode hosts slots too (it has no children channel).
    if (node instanceof ElementNode || $isDecoratorNode(node)) {
      $updateSlotsYType(yDomFragment, node, binding, dirtyElements, y);
    }
  }
  // update children
  const lChildren = normalizeNodeContent(node);
  const lChildCnt = lChildren.length;
  // Opaque children are left out of the diff, and `yIndices` maps the rest
  // back to their indices in yDomFragment.
  const {children: yChildren, indices: yIndices} = visibleChildren(
    binding,
    yDomFragment,
  );
  const yChildCnt = yChildren.length;
  const minCnt = Math.min(lChildCnt, yChildCnt);
  let left = 0;
  let right = 0;
  // find number of matching elements from left
  for (; left < minCnt; left++) {
    const leftY = yChildren[left];
    const leftL = lChildren[left];
    if (leftY instanceof XmlHook) {
      break;
    } else if (mappedIdentity(binding.mapping.get(leftY), leftL)) {
      // A mapped decorator host (one with slots) needs an in-place update too so
      // its slot channel propagates; only slotted decorators are mapped, so a
      // plain decorator never reaches this branch.
      if (
        !(leftL instanceof Array) &&
        (leftL instanceof ElementNode || $isDecoratorNode(leftL)) &&
        dirtyElements.has(leftL.getKey())
      ) {
        $updateYFragment(
          y,
          leftY as XmlElement,
          leftL as LexicalNode,
          binding,
          dirtyElements,
        );
      }
    } else if ($equalYTypePNode(leftY, leftL, binding)) {
      // update mapping
      binding.mapping.set(leftY, leftL);
    } else {
      break;
    }
  }
  // find number of matching elements from right
  for (; right + left < minCnt; right++) {
    const rightY = yChildren[yChildCnt - right - 1];
    const rightL = lChildren[lChildCnt - right - 1];
    if (rightY instanceof XmlHook) {
      break;
    } else if (mappedIdentity(binding.mapping.get(rightY), rightL)) {
      if (
        !(rightL instanceof Array) &&
        (rightL instanceof ElementNode || $isDecoratorNode(rightL)) &&
        dirtyElements.has(rightL.getKey())
      ) {
        $updateYFragment(
          y,
          rightY as XmlElement,
          rightL as LexicalNode,
          binding,
          dirtyElements,
        );
      }
    } else if ($equalYTypePNode(rightY, rightL, binding)) {
      // update mapping
      binding.mapping.set(rightY, rightL);
    } else {
      break;
    }
  }
  // try to compare and update
  while (yChildCnt - left - right > 0 && lChildCnt - left - right > 0) {
    const leftY = yChildren[left];
    const leftL = lChildren[left];
    const rightY = yChildren[yChildCnt - right - 1];
    const rightL = lChildren[lChildCnt - right - 1];
    if (leftY instanceof XmlText && leftL instanceof Array) {
      if (!equalYTextLText(leftY, leftL, binding)) {
        $updateYText(leftY, leftL, binding);
      }
      left += 1;
    } else {
      let updateLeft =
        leftY instanceof XmlElement && matchNodeName(leftY, leftL);
      let updateRight =
        rightY instanceof XmlElement && matchNodeName(rightY, rightL);
      if (updateLeft && updateRight) {
        // decide which which element to update
        const equalityLeft = $computeChildEqualityFactor(
          leftY as XmlElement,
          leftL as LexicalNode,
          binding,
        );
        const equalityRight = $computeChildEqualityFactor(
          rightY as XmlElement,
          rightL as LexicalNode,
          binding,
        );
        if (equalityLeft.foundMappedChild && !equalityRight.foundMappedChild) {
          updateRight = false;
        } else if (
          !equalityLeft.foundMappedChild &&
          equalityRight.foundMappedChild
        ) {
          updateLeft = false;
        } else if (equalityLeft.equalityFactor < equalityRight.equalityFactor) {
          updateLeft = false;
        } else {
          updateRight = false;
        }
      }
      if (updateLeft) {
        $updateYFragment(
          y,
          leftY as XmlElement,
          leftL as LexicalNode,
          binding,
          dirtyElements,
        );
        left += 1;
      } else if (updateRight) {
        $updateYFragment(
          y,
          rightY as XmlElement,
          rightL as LexicalNode,
          binding,
          dirtyElements,
        );
        right += 1;
      } else {
        binding.mapping.delete(yDomFragment.get(yIndices[left]));
        yDomFragment.delete(yIndices[left], 1);
        yDomFragment.insert(yIndices[left], [
          $createTypeFromTextOrElementNode(leftL, binding),
        ]);
        left += 1;
      }
    }
  }
  const yDelLen = yChildCnt - left - right;
  if (yChildCnt === 1 && lChildCnt === 0 && yChildren[0] instanceof XmlText) {
    binding.mapping.delete(yChildren[0]);
    // Edge case handling https://github.com/yjs/y-prosemirror/issues/108
    // Only delete the content of the Y.Text to retain remote changes on the same Y.Text object
    yChildren[0].delete(0, yChildren[0].length);
  } else if (yDelLen > 0) {
    // Delete from the end in runs of adjacent indices, so that opaque
    // children in between survive and the earlier indices stay valid.
    for (let end = left + yDelLen; end > left; ) {
      let start = end - 1;
      while (start > left && yIndices[start - 1] === yIndices[start] - 1) {
        start--;
      }
      for (let i = start; i < end; i++) {
        binding.mapping.delete(yChildren[i] as XmlElement | XmlText);
      }
      yDomFragment.delete(yIndices[start], end - start);
      end = start;
    }
  }
  if (left + right < lChildCnt) {
    const ins = [];
    for (let i = left; i < lChildCnt - right; i++) {
      ins.push($createTypeFromTextOrElementNode(lChildren[i], binding));
    }
    // Insert right after the preceding visible child, so that new content
    // (e.g. the second half of a split) stays next to its left neighbour
    // instead of jumping over an opaque child. With no preceding visible
    // child, insert before the next one (shifted by the deletions above).
    let index: number;
    if (left > 0) {
      index = yIndices[left - 1] + 1;
    } else if (right > 0) {
      index = yIndices[left + yDelLen] - yDelLen;
    } else {
      index = yDomFragment.length;
    }
    yDomFragment.insert(index, ins);
  }
};

const matchNodeName = (yElement: XmlElement, lnode: LexicalNode | TextNode[]) =>
  !(lnode instanceof Array) && yElement.nodeName === lnode.getType();
