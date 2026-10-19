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
 *
 * @experimental Inline-format layout (opt-in, see CreateBindingV2Options__EXPERIMENTAL.inlineFormats).
 * Three things change in a document written in it:
 * - An inline ElementNode whose class declares `$config({collab: {inline: 'format'}})` (e.g.
 *   LinkNode) is not written as its own XmlElement. Its leaves join the enclosing XmlText run and
 *   carry its keys, the way bold is stored: `w_<type>: true` for its presence, plus one key per
 *   non-default schema field and NodeState entry (`w_<type>|<field>`). Wrapping or unwrapping text
 *   is then a formatting change that keeps the characters' Yjs identity. On read, the wrapper tree
 *   is rebuilt from runs of equal keys (see buildInlineTree). Non-text leaves inside a wrapper that
 *   are still separate XmlElements (inline decorators, inline elements that do not opt in) carry
 *   the same keys in WRAPPERS_ATTR_KEY.
 * - A TextNode's format is written as one `f_<format>` key per format (`f_bold`, ...) instead of
 *   inside `p`, so concurrent formatting with different formats on overlapping text merges.
 * - A LineBreakNode is written as a "\n" character in the XmlText run (with `t` set to its type)
 *   instead of as a sibling XmlElement, so inserting a line break does not split the run.
 * Such a document is marked in the LAYOUT_MAP_NAME map. A binding only marks a document whose root
 * is still empty; documents with content are never converted. Readers understand both layouts.
 */

import type {BindingV2} from './Bindings';

import invariant from '@lexical/internal/invariant';
import {
  $getNodeByKey,
  $getSelection,
  $getSlot,
  $getSlotNames,
  $getWritableNodeState,
  $isDecoratorNode,
  $isLineBreakNode,
  $isRangeSelection,
  $isTextNode,
  $removeSlot,
  $setSlot,
  ElementNode,
  getComposedSchemaFields,
  getDeclaredCollabConfig,
  getDeclaredSlots,
  getStaticNodeConfig,
  HISTORY_MERGE_TAG,
  type Klass,
  type LexicalNode,
  LineBreakNode,
  type NodeKey,
  RootNode,
  TEXT_TYPE_TO_FORMAT,
  TextNode,
} from 'lexical';
import {
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
  type YMapEvent,
} from 'yjs';

import simpleDiffWithCursor from './simpleDiffWithCursor';
import {
  $isSlotValueNode,
  $syncPropertiesFromYjs,
  getDefaultNodeProperties,
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
  [key: `f_${string}`]: unknown; // one TextNode format (inline-format layout)
  [key: `w_${string}`]: unknown; // inline wrapper (inline-format layout)
  i?: number; // used to prevent Yjs from merging text nodes itself
  ychange?: Record<string, unknown>;
};

/** A leaf written into an XmlText run. */
type RunNode = TextNode | LineBreakNode;

const isRootElement = (el: XmlElement): boolean =>
  el.nodeName === ROOT_NODE_NAME;

export const $createOrUpdateNodeFromYElement = (
  el: XmlElement,
  binding: BindingV2,
  keysChanged: Set<string> | null,
  childListChanged: boolean,
  snapshot?: Snapshot,
  prevSnapshot?: Snapshot,
  computeYChange?: ComputeYChange,
): LexicalNode | null => {
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
    const items: InlineItem[] = [];
    let hasWrappers = false;
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
          const wrappers = $parseWrapperDescriptors(
            childType.getAttribute(WRAPPERS_ATTR_KEY) as unknown,
            binding,
          );
          hasWrappers = hasWrappers || wrappers.length > 0;
          items.push({node: n, wrappers});
        }
      } else if (childType instanceof XmlText) {
        const {nodes, attributes} = $createOrUpdateTextNodesFromYText(
          childType,
          binding,
          snapshot,
          prevSnapshot,
          computeYChange,
        );
        nodes.forEach((textchild, i) => {
          const wrappers = $parseWrapperDescriptors(attributes[i], binding);
          hasWrappers = hasWrappers || wrappers.length > 0;
          items.push({node: textchild, wrappers});
        });
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

    // Without wrapper attributes (always the case for a document written in
    // the default layout) the children are the items themselves, as before.
    // Otherwise, or when the block still holds wrappers that may have to be
    // unwrapped, rebuild the wrapper tree.
    if (
      hasWrappers ||
      (isInlineFormatLayout(binding) &&
        node.getChildren().some($isFormatWrapper))
    ) {
      $rebuildInlineChildren(node, items, binding);
    } else {
      $spliceChildren(
        node,
        items.map(item => item.node),
      );
    }
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
      k !== WRAPPERS_ATTR_KEY &&
      k !== '__proto__' &&
      k !== 'constructor' &&
      k !== 'prototype'
    ) {
      // Skip prototype-polluting property keys from untrusted remote attrs.
      // SLOTS_ATTR_KEY is a dedicated channel restored below, not a node property.
      properties[k] = attrs[k];
    }
  }

  if (keysChanged !== null && keysChanged.has(WRAPPERS_ATTR_KEY)) {
    // A dedicated channel, not a node property.
    keysChanged = new Set(keysChanged);
    keysChanged.delete(WRAPPERS_ATTR_KEY);
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
): {nodes: RunNode[]; attributes: TextAttributes[]} => {
  const deltas = $mergeIndexOnlyDeltas(
    $splitLineBreakDeltas(
      toDelta(text, snapshot, prevSnapshot, computeYChange),
      binding,
    ),
    binding,
  );

  // Use existing text nodes if the count and types all align, otherwise throw out the existing
  // nodes and create new ones.
  let nodes: RunNode[] = binding.mapping.get(text) ?? [];

  const nodeTypes: string[] = deltas.map(
    delta => delta.attributes.t ?? TextNode.getType(),
  );
  const canReuseNodes =
    nodes.length === nodeTypes.length &&
    nodes.every((node, i) => node.getType() === nodeTypes[i]) &&
    // In the inline-format layout a local update (e.g. the follow-up that
    // canonicalizes wrappers) can merge mapped text nodes in the same update
    // cycle as a remote change, before the mapping is refreshed.
    (!isInlineFormatLayout(binding) ||
      nodes.every(node => $getNodeByKey(node.getKey()) !== null));
  if (!canReuseNodes) {
    const registeredNodes = binding.editor._nodes;
    nodes = nodeTypes.map(type => {
      const nodeInfo = registeredNodes.get(type);
      if (nodeInfo === undefined) {
        throw new Error(
          `$createTextNodesFromYText: Node ${type} is not registered`,
        );
      }
      const node = new nodeInfo.klass();
      // A LineBreakNode is only ever written into a run by the inline-format
      // layout; reading it is always supported.
      if (!$isTextNode(node) && !$isLineBreakNode(node)) {
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
    if ($isTextNode(node) && node.__text !== insert) {
      node.setTextContent(insert);
    }
    const properties: Record<string, unknown> = {
      ...getDefaultNodeProperties(node, binding),
      ...attributes.p,
    };
    const formatBits = readFormatBits(attributes);
    if (formatBits !== 0) {
      properties.__format =
        ((properties.__format as number | undefined) || 0) | formatBits;
    }
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
  return {attributes: deltas.map(d => d.attributes), nodes: latestNodes};
};

// Inline-format layout: adjacent text deltas that differ only in `i` (the
// merge guard) describe TextNodes Lexical would merge anyway. Read them as one
// node instead of letting normalization merge them, which would make every
// reader write the merge (an `i` re-index) back right away: two peers whose
// views briefly disagree would then keep re-indexing each other's runs. The
// stale `i` is fixed by the next local edit of the run.
const $mergeIndexOnlyDeltas = (
  deltas: {insert: string; attributes: TextAttributes}[],
  binding: BindingV2,
): {insert: string; attributes: TextAttributes}[] => {
  if (deltas.length < 2 || !isInlineFormatLayout(binding)) {
    return deltas;
  }
  const withoutIndex = (attributes: TextAttributes) => {
    const {i: _i, ...rest} = attributes;
    return rest;
  };
  const isText = (d: {attributes: TextAttributes}) =>
    (d.attributes.t ?? TextNode.getType()) === TextNode.getType();
  const result: {insert: string; attributes: TextAttributes}[] = [];
  for (const d of deltas) {
    const prev = result[result.length - 1];
    if (
      prev !== undefined &&
      isText(prev) &&
      isText(d) &&
      !prev.insert.includes('\n') &&
      !d.insert.includes('\n') &&
      equalAttrs(withoutIndex(prev.attributes), withoutIndex(d.attributes))
    ) {
      result[result.length - 1] = {
        attributes: prev.attributes,
        insert: prev.insert + d.insert,
      };
    } else {
      result.push(d);
    }
  }
  return result;
};

const isLineBreakClass = (klass: Klass<LexicalNode>): boolean =>
  klass === LineBreakNode || klass.prototype instanceof LineBreakNode;

// A line break in a run (inline-format layout) is one "\n" character typed as
// a LineBreakNode. Yjs only merges adjacent characters with equal attributes
// and every node in a run carries its own `i`, so such a delta normally holds
// exactly "\n", but the type is a format attribute and can be lost (an undo
// that restores formatting partially, a concurrent rewrite). In this layout the
// character is what makes a line break: a "\n" in any delta becomes a
// LineBreakNode (Lexical keeps line breaks out of TextNodes) and any other
// character in a line-break delta becomes plain text, rather than failing to
// read it or showing a TextNode holding "\n".
const $splitLineBreakDeltas = (
  deltas: {insert: string; attributes: TextAttributes}[],
  binding: BindingV2,
): {insert: string; attributes: TextAttributes}[] => {
  const isLineBreakType = (type: string | undefined) => {
    if (type === undefined) {
      return false;
    }
    const nodeInfo = binding.editor._nodes.get(type);
    return nodeInfo !== undefined && isLineBreakClass(nodeInfo.klass);
  };
  const inlineFormats = isInlineFormatLayout(binding);
  const needsSplit = (d: {insert: string; attributes: TextAttributes}) =>
    isLineBreakType(d.attributes.t)
      ? d.insert !== '\n'
      : inlineFormats && d.insert.includes('\n');
  if (!deltas.some(needsSplit)) {
    return deltas;
  }
  // Only the wrappers carry over to a line break split out of a text delta.
  const lineBreakAttributes = (attributes: TextAttributes): TextAttributes => {
    if (isLineBreakType(attributes.t)) {
      return attributes;
    }
    const result: TextAttributes = {t: LineBreakNode.getType()};
    for (const k in attributes) {
      if (isWrapperAttrKey(k)) {
        result[k as `w_${string}`] = attributes[k as `w_${string}`];
      }
    }
    return result;
  };
  const result: {insert: string; attributes: TextAttributes}[] = [];
  for (const d of deltas) {
    if (!needsSplit(d)) {
      result.push(d);
      continue;
    }
    const textAttributes: TextAttributes = isLineBreakType(d.attributes.t)
      ? (({t: _t, p: _p, ...rest}) => rest)(d.attributes)
      : d.attributes;
    for (const part of d.insert.split(/(\n)/)) {
      if (part === '\n') {
        result.push({
          attributes: lineBreakAttributes(d.attributes),
          insert: part,
        });
      } else if (part !== '') {
        result.push({attributes: textAttributes, insert: part});
      }
    }
  }
  return result;
};

const $createTypeFromTextNodes = (
  nodes: RunNode[],
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
  const attrs = $elementAttributes(node, binding);
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
    normalizeNodeContent(node, binding).map(n =>
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
  node: LexicalNode | RunNode[],
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

type NormalizedPNodeContent = (RunNode[] | LexicalNode)[];

const normalizeNodeContent = (
  node: LexicalNode,
  binding: BindingV2,
): NormalizedPNodeContent => {
  if (!(node instanceof ElementNode)) {
    return [];
  }
  if (isInlineFormatLayout(binding)) {
    return normalizeInlineFormatContent(node);
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

const $equalYTextLText = (
  ytext: XmlText,
  ltexts: RunNode[],
  binding: BindingV2,
) => {
  const deltas = toDelta(ytext);
  if (isInlineFormatLayout(binding)) {
    return $equalRunInlineFormatLayout(deltas, ltexts, binding);
  }
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
  lnode: LexicalNode | RunNode[],
  binding: BindingV2,
): ytype is XmlElement | XmlText => {
  if (
    ytype instanceof XmlElement &&
    !(lnode instanceof Array) &&
    matchNodeName(ytype, lnode)
  ) {
    const normalizedContent = normalizeNodeContent(lnode, binding);
    // SLOTS_ATTR_KEY is a dedicated channel compared by $equalSlots, never a node
    // property; leaving it in would make every slotted host compare unequal.
    const yattrs = ytype.getAttributes() as Record<string, unknown>;
    delete yattrs[SLOTS_ATTR_KEY];
    return (
      ytype._length === normalizedContent.length &&
      equalAttrs(yattrs, $elementAttributes(lnode, binding)) &&
      $equalSlots(ytype, lnode, binding) &&
      ytype
        .toArray()
        .every((ychild, i) =>
          $equalYTypePNode(ychild, normalizedContent[i], binding),
        )
    );
  }
  return (
    ytype instanceof XmlText &&
    lnode instanceof Array &&
    $equalYTextLText(ytype, lnode, binding)
  );
};

const mappedIdentity = (
  mapped: LexicalNode | RunNode[] | undefined,
  lcontent: LexicalNode | RunNode[],
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
  const yChildren = ytype.toArray();
  const pChildren = normalizeNodeContent(lnode, binding);
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

const ytextTrans = (ytext: YText): {str: string} => {
  let str = '';
  let n = ytext._start;
  while (n !== null) {
    if (!n.deleted && n.countable && n.content instanceof ContentString) {
      str += n.content.str;
    }
    n = n.right;
  }
  return {str};
};

const $updateYText = (
  ytext: XmlText,
  ltexts: RunNode[],
  binding: BindingV2,
) => {
  binding.mapping.set(ytext, ltexts);
  const {str} = ytextTrans(ytext);
  const inlineFormats = isInlineFormatLayout(binding);
  const content = ltexts.map((node, i) => {
    let attributes: Record<string, unknown>;
    if (inlineFormats) {
      attributes = $runNodeAttributes(node, binding);
      if (i > 0) {
        attributes.i = i; // Prevent Yjs from merging text nodes itself.
      }
    } else {
      const nodeType = node.getType();
      const p = propertiesToAttributes(node, binding);
      attributes = {
        ...(nodeType !== TextNode.getType() && {t: nodeType}),
        ...(Object.keys(p).length > 0 && {p}),
        ...stateToAttributes(node),
        ...(i > 0 && {i}), // Prevent Yjs from merging text nodes itself.
      };
    }
    return {
      attributes,
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
  if (inlineFormats) {
    // Insert with each run's own attributes rather than inheriting the
    // surrounding formats and reformatting afterwards.
    insertWithRunAttributes(ytext, index, insert.length, content, binding);
    if (ytext.doc === null) {
      // A new type holds exactly what was just inserted.
      return;
    }
  } else {
    ytext.insert(index, insert);
  }
  // A type that is not part of a document yet queues its edits, so it holds
  // the plain text that was just inserted
  const delta = diffTextAttributes(
    ytext.doc === null ? [{insert: nextText}] : ytext.toDelta(),
    content,
    inlineFormats
      ? (key, desired) => $isInlineFormatOwnedKey(key, desired, binding)
      : isBindingTextAttrKey,
  );
  if (delta.length > 0) {
    ytext.applyDelta(delta);
  }
};

/**
 * The text attribute keys this binding writes (see TextAttributes). Any other
 * key on a run belongs to someone else (e.g. a peer running a newer version)
 * and is left alone rather than removed.
 */
const isBindingTextAttrKey = (key: string): boolean =>
  key === 't' || key === 'p' || key === 'i' || key.startsWith(STATE_KEY_PREFIX);

const equalAttrValues = (a: unknown, b: unknown): boolean => {
  if (a === b) {
    return true;
  }
  if (!isObject(a) || !isObject(b)) {
    return false;
  }
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length &&
    keys.every(
      key =>
        Object.prototype.hasOwnProperty.call(b, key) &&
        equalAttrValues(a[key], b[key]),
    )
  );
};

/**
 * Computes the retain-only delta that turns the attributes `ytext` currently
 * holds (`current`, from `ytext.toDelta()`) into the `desired` attributes of
 * each run, where both describe the same text. Only the keys whose value
 * differs are emitted, and only over the ranges where they differ. Keys the
 * binding does not own are never removed.
 *
 * Re-asserting unchanged attributes is not a no-op in Yjs: formatting a range
 * deletes the format markers inside it and inserts new ones at its edges. Done
 * from a view that lacks a concurrent change (a peer's edit that has not
 * arrived yet), the new markers survive the merge and resurrect attributes the
 * peer removed, or extend them past the range the peer gave them.
 */
const diffTextAttributes = (
  current: {insert: unknown; attributes?: Record<string, unknown>}[],
  desired: {insert: string; attributes: Record<string, unknown>}[],
  // Whether the binding owns `key` on a run whose desired attributes are
  // `runAttributes`; a key it does not own is never removed.
  isOwnedKey: (
    key: string,
    runAttributes: Record<string, unknown>,
  ) => boolean = isBindingTextAttrKey,
): {retain: number; attributes?: Record<string, unknown>}[] => {
  const delta: {retain: number; attributes?: Record<string, unknown>}[] = [];
  let pendingRetain = 0;
  let ci = 0;
  let di = 0;
  // Characters of current[ci] / desired[di] already consumed
  let cOffset = 0;
  let dOffset = 0;
  while (ci < current.length && di < desired.length) {
    const c = current[ci];
    const d = desired[di];
    const cLength = typeof c.insert === 'string' ? c.insert.length : 1;
    const length = Math.min(cLength - cOffset, d.insert.length - dOffset);
    const cAttrs = c.attributes ?? {};
    const dAttrs = d.attributes;
    const changed: Record<string, unknown> = {};
    let hasChanges = false;
    for (const key in cAttrs) {
      if (
        isOwnedKey(key, dAttrs) &&
        !Object.prototype.hasOwnProperty.call(dAttrs, key)
      ) {
        changed[key] = null;
        hasChanges = true;
      }
    }
    for (const key in dAttrs) {
      if (!equalAttrValues(cAttrs[key] ?? null, dAttrs[key] ?? null)) {
        changed[key] = dAttrs[key] ?? null;
        hasChanges = true;
      }
    }
    if (length > 0) {
      const last = delta[delta.length - 1];
      if (!hasChanges) {
        pendingRetain += length;
      } else if (
        pendingRetain === 0 &&
        last !== undefined &&
        equalAttrValues(last.attributes, changed)
      ) {
        last.retain += length;
      } else {
        if (pendingRetain > 0) {
          delta.push({retain: pendingRetain});
          pendingRetain = 0;
        }
        delta.push({attributes: changed, retain: length});
      }
    }
    cOffset += length;
    dOffset += length;
    if (cOffset >= cLength) {
      ci++;
      cOffset = 0;
    }
    if (dOffset >= d.insert.length) {
      di++;
      dOffset = 0;
    }
  }
  return delta;
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
    const lexicalAttrs: Record<string, unknown> = $elementAttributes(
      node,
      binding,
    );
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
  const lChildren = normalizeNodeContent(node, binding);
  const lChildCnt = lChildren.length;
  const yChildren = yDomFragment.toArray();
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
      $updateRunIfWrappersChanged(leftY, leftL, binding, dirtyElements);
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
      $updateRunIfWrappersChanged(rightY, rightL, binding, dirtyElements);
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
      if (!$equalYTextLText(leftY, leftL, binding)) {
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
        binding.mapping.delete(yDomFragment.get(left));
        yDomFragment.delete(left, 1);
        yDomFragment.insert(left, [
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
    yDomFragment
      .slice(left, left + yDelLen)
      .forEach(type => binding.mapping.delete(type));
    yDomFragment.delete(left, yDelLen);
  }
  if (left + right < lChildCnt) {
    const ins = [];
    for (let i = left; i < lChildCnt - right; i++) {
      ins.push($createTypeFromTextOrElementNode(lChildren[i], binding));
    }
    yDomFragment.insert(left, ins);
  }
};

const matchNodeName = (yElement: XmlElement, lnode: LexicalNode | RunNode[]) =>
  !(lnode instanceof Array) && yElement.nodeName === lnode.getType();

// ---------------------------------------------------------------------------
// @experimental Inline-format layout. See the notes at the top of this file.

/**
 * @internal Top-level Y.Map holding, per root, the layout version the
 * document is written in. It is kept outside the root XmlElement so that
 * clients from before this layout, which rewrite the root's attributes, leave
 * it alone.
 */
export const LAYOUT_MAP_NAME = 'lexical-collab-layout';
/** @internal The inline-format layout version this binding reads and writes. */
export const INLINE_FORMATS_LAYOUT_VERSION = 1;
/**
 * @internal Attribute of a non-text XmlElement (inline decorator, inline
 * element that is not a format wrapper) holding the wrapper keys of the
 * wrappers around it, in the same form a text run uses.
 */
export const WRAPPERS_ATTR_KEY = '__wrappers';
const WRAPPER_ATTR_PREFIX = 'w_';
// Separates a wrapper's type from one of its properties: `w_link|url`.
const WRAPPER_FIELD_SEPARATOR = '|';
// Prefix of a wrapper property whose value is not a primitive and is stored as
// a JSON string: `w_link|~meta`.
const JSON_VALUE_PREFIX = '~';
const FORMAT_ATTR_PREFIX = 'f_';
let namedFormatBits: number | undefined;
const getNamedFormatBits = (): number => {
  if (namedFormatBits === undefined) {
    namedFormatBits = 0;
    for (const name in TEXT_TYPE_TO_FORMAT) {
      namedFormatBits |= TEXT_TYPE_TO_FORMAT[name];
    }
  }
  return namedFormatBits;
};

/**
 * Which layout a binding uses for its document:
 * - `'default'`: the default layout (unmarked document);
 * - `'inline'`: the inline-format layout;
 * - `'unsupported'`: the document is marked with a newer inline-format layout
 *   version than this binding supports. It is read as well as possible and
 *   never written: local edits are not synced.
 */
export type InlineFormatLayoutState = 'default' | 'inline' | 'unsupported';

type LayoutRecord = {
  /** Cached state; absent while it can still change without a mark. */
  state?: InlineFormatLayoutState;
  unobserve?: () => void;
  unregisterTransforms?: () => void;
  reportedUnsupported?: boolean;
};

const layoutRecords = new WeakMap<BindingV2, LayoutRecord>();
const rootLayoutKeys = new WeakMap<BindingV2, string>();

function getLayoutRecord(binding: BindingV2): LayoutRecord {
  let record = layoutRecords.get(binding);
  if (record === undefined) {
    record = {};
    layoutRecords.set(binding, record);
  }
  return record;
}

// The key of this binding's root in LAYOUT_MAP_NAME: the name of a top-level
// root, or the Yjs id of a root nested in another type (the same on every
// client).
function getRootLayoutKey(binding: BindingV2): string {
  let key = rootLayoutKeys.get(binding);
  if (key === undefined) {
    const {root, doc} = binding;
    if (root._item !== null) {
      key = `item:${root._item.id.client}:${root._item.id.clock}`;
    } else {
      for (const [name, type] of doc.share) {
        if ((type as unknown) === root) {
          key = `root:${name}`;
          break;
        }
      }
      invariant(
        key !== undefined,
        'createBindingV2: the root XmlElement is neither a top-level type of its doc nor nested in one',
      );
    }
    rootLayoutKeys.set(binding, key);
  }
  return key;
}

function getLayoutMap(binding: BindingV2): YMap<unknown> {
  const map = binding.doc.getMap(LAYOUT_MAP_NAME);
  const record = getLayoutRecord(binding);
  if (record.unobserve === undefined) {
    // A mark that arrives (or changes) invalidates the cached state.
    const key = getRootLayoutKey(binding);
    const observer = (event: YMapEvent<unknown>) => {
      if (event.keysChanged.has(key)) {
        delete getLayoutRecord(binding).state;
      }
    };
    map.observe(observer);
    record.unobserve = () => map.unobserve(observer);
  }
  return map;
}

function readLayoutVersion(binding: BindingV2): number | undefined {
  const version = getLayoutMap(binding).get(getRootLayoutKey(binding));
  return typeof version === 'number' ? version : undefined;
}

/**
 * Which layout `binding` uses: the one its document is marked with, or the
 * default layout for an unmarked document. Cached per binding; a change to the
 * mark invalidates it.
 */
export function getLayoutState(binding: BindingV2): InlineFormatLayoutState {
  const record = getLayoutRecord(binding);
  if (record.state === undefined) {
    const version = readLayoutVersion(binding);
    record.state =
      version === undefined
        ? 'default'
        : version <= INLINE_FORMATS_LAYOUT_VERSION
          ? 'inline'
          : 'unsupported';
  }
  return record.state;
}

/** @internal Whether `binding` reads (and, unless unsupported, writes) the inline-format layout. */
export function isInlineFormatLayout(binding: BindingV2): boolean {
  return getLayoutState(binding) !== 'default';
}

/**
 * Whether `binding` may write to its document: false when the document uses a
 * newer layout version. Called inside the transaction of a local write.
 */
export function prepareLayoutForWrite(binding: BindingV2): boolean {
  return getLayoutState(binding) !== 'unsupported';
}

/**
 * @internal Marks the document as written in the inline-format layout, when
 * the binding was created with `inlineFormats: true`, the document is not
 * marked yet and its shared root is empty. The caller must only call it once
 * the document is known to be complete locally (after the provider's first
 * sync), right before writing the first content. Returns the resulting state.
 */
export function initializeInlineFormatLayout(
  binding: BindingV2,
): InlineFormatLayoutState {
  if (
    binding.inlineFormats === true &&
    getLayoutState(binding) === 'default' &&
    binding.root._length === 0
  ) {
    const map = getLayoutMap(binding);
    binding.doc.transact(() => {
      map.set(getRootLayoutKey(binding), INLINE_FORMATS_LAYOUT_VERSION);
    }, binding);
    getLayoutRecord(binding).state = 'inline';
    syncInlineFormatLayout(binding);
  }
  return getLayoutState(binding);
}

/**
 * @internal Called by the sync functions outside any update or transaction.
 * Once the document is marked with the inline-format layout, registers the
 * binding's node transforms (see registerInlineFormatTransforms). For a newer
 * (unsupported) layout version, makes the editor read-only and reports it
 * once through the editor's `onWarn`.
 */
export function syncInlineFormatLayout(binding: BindingV2): void {
  const state = getLayoutState(binding);
  const record = getLayoutRecord(binding);
  if (state === 'inline' && record.unregisterTransforms === undefined) {
    record.unregisterTransforms = registerInlineFormatTransforms(binding);
  } else if (state === 'unsupported' && record.reportedUnsupported !== true) {
    record.reportedUnsupported = true;
    const error = new Error(
      `@lexical/yjs: this document is written in inline-format layout version ${readLayoutVersion(binding)}, newer than the supported version ${INLINE_FORMATS_LAYOUT_VERSION}. The editor is made read-only because local changes could not be synced; upgrade @lexical/yjs.`,
    );
    const {editor} = binding;
    // Outside the Yjs observer or update listener this runs in, so an onWarn
    // that throws (the development default) cannot interrupt them.
    queueMicrotask(() => {
      editor.setEditable(false);
      editor._onWarn(error);
    });
  }
}

/**
 * @internal Releases what the inline-format layout registered for `binding`:
 * its node transforms and its observer of the layout mark. The binding
 * registers them again on its next sync if it is still used.
 */
export function disposeInlineFormatLayout(binding: BindingV2): void {
  const record = layoutRecords.get(binding);
  if (record !== undefined) {
    if (record.unregisterTransforms !== undefined) {
      record.unregisterTransforms();
    }
    if (record.unobserve !== undefined) {
      record.unobserve();
    }
    layoutRecords.delete(binding);
  }
}

type WrapperSpec = {
  /** The node's own schema fields, beyond those ElementNode declares. */
  readonly fields: ReadonlySet<string>;
};

const wrapperSpecCache = new WeakMap<Klass<LexicalNode>, WrapperSpec | null>();
let elementFieldNames: ReadonlySet<string> | undefined;

const getElementFieldNames = (): ReadonlySet<string> => {
  if (elementFieldNames === undefined) {
    elementFieldNames = new Set(
      Object.keys(getComposedSchemaFields(ElementNode)),
    );
  }
  return elementFieldNames;
};

function getWrapperSpec(klass: Klass<LexicalNode>): WrapperSpec | null {
  let spec = wrapperSpecCache.get(klass);
  if (spec === undefined) {
    spec = null;
    if (
      klass.prototype instanceof ElementNode &&
      getDeclaredCollabConfig(klass).inline === 'format'
    ) {
      const type = getStaticNodeConfig(klass).ownNodeType;
      if (typeof type === 'string' && type.includes(WRAPPER_FIELD_SEPARATOR)) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(
            `@lexical/yjs: node type ${type} contains "${WRAPPER_FIELD_SEPARATOR}" and cannot be stored as a format; it is stored as an element.`,
          );
        }
      } else {
        const base = getElementFieldNames();
        spec = {
          fields: new Set(
            Object.keys(getComposedSchemaFields(klass)).filter(
              name => !base.has(name),
            ),
          ),
        };
      }
    }
    wrapperSpecCache.set(klass, spec);
  }
  return spec;
}

/**
 * The node's compact JSON as its serialization schema writes it: the base
 * `LexicalNode.exportJSON`, so a subclass override that writes more (or
 * other) properties does not change what is synchronized, without the
 * NodeState it appends (synchronized separately).
 */
function $exportSchemaJSON(node: LexicalNode): Record<string, unknown> {
  // ElementNode does not override exportJSON; this is LexicalNode's.
  const json = ElementNode.prototype.exportJSON.call(node, true) as Record<
    string,
    unknown
  >;
  const state = node.__state ? node.__state.toJSON() : undefined;
  if (state !== undefined) {
    for (const key in state) {
      delete json[key];
    }
  }
  return json;
}

/** The wrapper spec of a registered node type, or null. */
function $getWrapperSpecForType(
  type: string,
  binding: BindingV2,
): WrapperSpec | null {
  const nodeInfo = binding.editor._nodes.get(type);
  return nodeInfo === undefined ? null : getWrapperSpec(nodeInfo.klass);
}

/**
 * An inline ElementNode whose class declares `collab: {inline: 'format'}`.
 * Whether it is written that way also depends on the layout.
 */
function $isFormatWrapper(node: LexicalNode | null): node is ElementNode {
  return (
    node instanceof ElementNode &&
    getWrapperSpec(node.constructor as Klass<LexicalNode>) !== null &&
    node.isInline()
  );
}

/**
 * @internal A format wrapper that this binding writes as format keys, so it
 * has no shared type of its own.
 */
export function $isInlineFormatWrapperV2(
  node: LexicalNode | null | undefined,
  binding: BindingV2,
): node is ElementNode {
  return (
    node != null && $isFormatWrapper(node) && isInlineFormatLayout(binding)
  );
}

const isWrapperAttrKey = (key: string) => key.startsWith(WRAPPER_ATTR_PREFIX);

/** Splits `w_<type>` / `w_<type>|<field>` into its type and field. */
const parseWrapperAttrKey = (
  key: string,
): {type: string; field: string | null} => {
  const rest = key.slice(WRAPPER_ATTR_PREFIX.length);
  const sep = rest.indexOf(WRAPPER_FIELD_SEPARATOR);
  return sep === -1
    ? {field: null, type: rest}
    : {field: rest.slice(sep + 1), type: rest.slice(0, sep)};
};

/** A wrapper field this client declares (a schema field or NodeState). */
const isDeclaredWrapperField = (field: string, spec: WrapperSpec): boolean => {
  const name = field.startsWith(JSON_VALUE_PREFIX)
    ? field.slice(JSON_VALUE_PREFIX.length)
    : field;
  return name.startsWith(STATE_KEY_PREFIX) || spec.fields.has(name);
};

/**
 * Whether the binding owns (writes, and so may remove) the text attribute
 * `key` of a run whose desired attributes are `desired`, in the inline-format
 * layout. Owned: the default layout's keys, the format keys of the formats
 * this version knows, the presence key of each wrapper type this editor can
 * rebuild, and that wrapper's declared fields, plus every field of a wrapper
 * the run no longer has. Left alone: anything else, notably formats, wrapper
 * types and wrapper fields that only a newer or differently configured peer
 * knows, so that peer keeps them.
 */
function $isInlineFormatOwnedKey(
  key: string,
  desired: Record<string, unknown>,
  binding: BindingV2,
): boolean {
  if (isWrapperAttrKey(key)) {
    const {type, field} = parseWrapperAttrKey(key);
    const spec = $getWrapperSpecForType(type, binding);
    if (spec === null) {
      return false;
    }
    return (
      field === null ||
      desired[WRAPPER_ATTR_PREFIX + type] !== true ||
      isDeclaredWrapperField(field, spec)
    );
  }
  if (key.startsWith(FORMAT_ATTR_PREFIX)) {
    return TEXT_TYPE_TO_FORMAT[key.slice(FORMAT_ATTR_PREFIX.length)] > 0;
  }
  return isBindingTextAttrKey(key);
}

/** Recursively key-sorted JSON, so equal values give equal strings. */
const stableStringify = (value: unknown): string =>
  JSON.stringify(value, (_k, v) =>
    isObject(v) && !Array.isArray(v)
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map(k => [k, v[k]]),
        )
      : v,
  );

const isPrimitive = (v: unknown): v is string | number | boolean | null =>
  v === null ||
  typeof v === 'string' ||
  typeof v === 'number' ||
  typeof v === 'boolean';

const isUnsafeKey = (key: string) =>
  key === '__proto__' || key === 'constructor' || key === 'prototype';

/**
 * The run members of an element in the inline-format layout: format wrappers
 * are transparent, so their TextNodes and LineBreakNodes join the enclosing
 * run, and every other child (inline decorator, other inline element) stays a
 * separate shared type.
 */
function normalizeInlineFormatContent(
  node: ElementNode,
): NormalizedPNodeContent {
  const res: NormalizedPNodeContent = [];
  let run: RunNode[] | null = null;
  const visit = (parent: ElementNode) => {
    for (
      let child = parent.getFirstChild();
      child !== null;
      child = child.getNextSibling()
    ) {
      if ($isTextNode(child) || $isLineBreakNode(child)) {
        if (run === null) {
          run = [];
          res.push(run);
        }
        run.push(child);
      } else if ($isFormatWrapper(child)) {
        visit(child);
      } else {
        run = null;
        res.push(child);
      }
    }
  };
  visit(node);
  return res;
}

/**
 * The keys describing one wrapper: `w_<type>: true` for its presence, then one
 * key per schema field that is not at its default (`w_<type>|<field>`, read
 * through the schema, not through `exportJSON`) and per NodeState entry
 * (`w_<type>|s_<key>`). Values that are not primitives are stored as JSON
 * under `w_<type>|~<field>`, because Yjs compares format values one level
 * deep. One key per property means a peer changing one property and a peer
 * changing another merge, and a property change never touches the presence of
 * the wrapper.
 */
function $ownWrapperAttributes(
  node: ElementNode,
  spec: WrapperSpec,
): Record<string, unknown> {
  const prefix = WRAPPER_ATTR_PREFIX + node.getType();
  const attrs: Record<string, unknown> = {[prefix]: true};
  const put = (field: string, value: unknown) => {
    if (value === undefined) {
      return;
    }
    if (isPrimitive(value)) {
      attrs[prefix + WRAPPER_FIELD_SEPARATOR + field] = value;
    } else {
      attrs[prefix + WRAPPER_FIELD_SEPARATOR + JSON_VALUE_PREFIX + field] =
        stableStringify(value);
    }
  };
  const json = $exportSchemaJSON(node.getLatest());
  for (const field of spec.fields) {
    put(field, json[field]);
  }
  const state = stateToAttributes(node.getLatest());
  for (const key in state) {
    put(key, state[key]);
  }
  return attrs;
}

/**
 * The wrapper keys of every format wrapper above `node`, up to the first
 * ancestor that is not one. For a type that appears more than once, the
 * innermost wins.
 */
function $wrapperAttributes(node: LexicalNode): Record<string, unknown> {
  const attrs: Record<string, unknown> = {};
  const seen = new Set<string>();
  for (
    let parent = node.getParent();
    $isFormatWrapper(parent);
    parent = parent.getParent()
  ) {
    const type = parent.getType();
    if (seen.has(type)) {
      continue;
    }
    seen.add(type);
    Object.assign(
      attrs,
      $ownWrapperAttributes(
        parent,
        getWrapperSpec(parent.constructor as Klass<LexicalNode>)!,
      ),
    );
  }
  return attrs;
}

/**
 * A run whose leaves are unchanged (so the mapping still matches it by
 * identity) still has to be rewritten when a format wrapper above one of them
 * changed, e.g. a link's URL: the wrapper has no shared type of its own.
 */
function $updateRunIfWrappersChanged(
  ytype: XmlElement | XmlText | XmlHook,
  lcontent: LexicalNode | RunNode[],
  binding: BindingV2,
  dirtyElements: Set<NodeKey>,
): void {
  if (
    !(ytype instanceof XmlText) ||
    !(lcontent instanceof Array) ||
    !isInlineFormatLayout(binding)
  ) {
    return;
  }
  const hasDirtyWrapper = lcontent.some(node => {
    for (
      let parent = node.getParent();
      $isFormatWrapper(parent);
      parent = parent.getParent()
    ) {
      if (dirtyElements.has(parent.getKey())) {
        return true;
      }
    }
    return false;
  });
  if (hasDirtyWrapper && !$equalYTextLText(ytype, lcontent, binding)) {
    $updateYText(ytype, lcontent, binding);
  }
}

/** Attributes of a non-run XmlElement (properties, state, wrappers). */
function $elementAttributes(
  node: LexicalNode,
  binding: BindingV2,
): Record<string, unknown> {
  const attrs: Record<string, unknown> = {
    ...propertiesToAttributes(node, binding),
    ...stateToAttributes(node),
  };
  if (isInlineFormatLayout(binding)) {
    const wrappers = $wrapperAttributes(node);
    if (Object.keys(wrappers).length > 0) {
      attrs[WRAPPERS_ATTR_KEY] = wrappers;
    }
  }
  return attrs;
}

/** The format bits named by `f_<format>` keys (`f_bold`, `f_italic`, ...). */
function readFormatBits(attributes: Record<string, unknown>): number {
  let bits = 0;
  for (const k in attributes) {
    if (k.startsWith(FORMAT_ATTR_PREFIX) && attributes[k] === true) {
      const bit = TEXT_TYPE_TO_FORMAT[k.slice(FORMAT_ATTR_PREFIX.length)];
      if (bit > 0) {
        bits |= bit;
      }
    }
  }
  return bits;
}

/**
 * The attributes of one run member in the inline-format layout (everything
 * but the `i` merge guard): its type, its properties with the format moved to
 * one `f_<format>` key per format, its state and its wrappers. Format bits
 * without a name, if any, stay in `p.__format`.
 */
function $runNodeAttributes(
  node: RunNode,
  binding: BindingV2,
): Record<string, unknown> {
  const attrs: Record<string, unknown> = {};
  const nodeType = node.getType();
  if (nodeType !== TextNode.getType()) {
    attrs.t = nodeType;
  }
  const p = propertiesToAttributes(node, binding);
  if ($isTextNode(node) && typeof p.__format === 'number') {
    const format = p.__format;
    delete p.__format;
    for (const name in TEXT_TYPE_TO_FORMAT) {
      if (format & TEXT_TYPE_TO_FORMAT[name]) {
        attrs[FORMAT_ATTR_PREFIX + name] = true;
      }
    }
    const unnamed = format & ~getNamedFormatBits();
    if (unnamed) {
      p.__format = unnamed;
    }
  }
  if (Object.keys(p).length > 0) {
    attrs.p = p;
  }
  Object.assign(attrs, stateToAttributes(node), $wrapperAttributes(node));
  return attrs;
}

function $equalRunInlineFormatLayout(
  deltas: {insert: string; attributes: TextAttributes}[],
  nodes: RunNode[],
  binding: BindingV2,
): boolean {
  return (
    deltas.length === nodes.length &&
    deltas.every((d, i) => {
      const node = nodes[i];
      if (
        d.insert !== node.getTextContent() ||
        (d.attributes.t ?? TextNode.getType()) !== node.getType()
      ) {
        return false;
      }
      const desired = $runNodeAttributes(node, binding);
      const actual: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(d.attributes)) {
        if (k !== 'i' && $isInlineFormatOwnedKey(k, desired, binding)) {
          actual[k] = v;
        }
      }
      return equalAttrs(actual, desired);
    })
  );
}

/**
 * Inline-format layout: the attributes to insert new text with, so it gets
 * exactly the attributes of the node it belongs to instead of inheriting
 * whatever formats surround the insertion point in Yjs (and then being
 * reformatted, which leaves restore markers carrying stale values behind).
 * Keys the binding does not own are carried over from the text before the
 * insertion point, as Yjs would have done.
 */
function insertAttributes(
  desired: Record<string, unknown>,
  inherited: Record<string, unknown>,
  binding: BindingV2,
): Record<string, unknown> {
  const attrs: Record<string, unknown> = {};
  for (const k in inherited) {
    if (k !== 'ychange' && !$isInlineFormatOwnedKey(k, desired, binding)) {
      attrs[k] = inherited[k];
    }
  }
  return Object.assign(attrs, desired);
}

/** The attributes of the character before `index` (none at the start). */
function attributesBefore(
  ytext: XmlText,
  index: number,
): Record<string, unknown> {
  if (index === 0 || ytext.doc === null) {
    return {};
  }
  let offset = 0;
  for (const d of ytext.toDelta() as {
    insert: unknown;
    attributes?: Record<string, unknown>;
  }[]) {
    offset += typeof d.insert === 'string' ? d.insert.length : 1;
    if (offset >= index) {
      return d.attributes ?? {};
    }
  }
  return {};
}

/**
 * Inline-format layout: insert `nextText.slice(index, index + length)`, each
 * part with the attributes of the run it belongs to.
 */
function insertWithRunAttributes(
  ytext: XmlText,
  index: number,
  length: number,
  content: {insert: string; attributes: Record<string, unknown>}[],
  binding: BindingV2,
): void {
  const inherited = attributesBefore(ytext, index);
  const end = index + length;
  let runStart = 0;
  for (const run of content) {
    const runEnd = runStart + run.insert.length;
    const from = Math.max(runStart, index);
    const to = Math.min(runEnd, end);
    if (from < to) {
      ytext.insert(
        from,
        run.insert.slice(from - runStart, to - runStart),
        insertAttributes(run.attributes, inherited, binding),
      );
    }
    runStart = runEnd;
    if (runStart >= end) {
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Rebuilding the wrapper tree.

type WrapperDescriptor = {
  /** Identity: adjacent leaves with equal keys share one wrapper. */
  readonly key: string;
  /**
   * The part of the identity this client can represent (presence, declared
   * fields, state), compared against existing nodes.
   */
  readonly declaredKey: string;
  readonly type: string;
  readonly spec: WrapperSpec;
  /** The wrapper keys of this one wrapper (`w_<type>` and its fields). */
  readonly attrs: Record<string, unknown>;
};

type InlineItem = {
  readonly node: LexicalNode;
  readonly wrappers: readonly WrapperDescriptor[];
};

const describeAttrs = (type: string, attrs: Record<string, unknown>) => {
  const sorted: Record<string, unknown> = {};
  for (const k of Object.keys(attrs).sort()) {
    sorted[k] = attrs[k];
  }
  return type + '\u0000' + stableStringify(sorted);
};

/**
 * The wrappers described by a run member's attributes (or a WRAPPERS_ATTR_KEY
 * map): one per `w_<type>: true` whose type this editor can rebuild. Other
 * types are ignored here (and preserved on write).
 */
function $parseWrapperDescriptors(
  attrs: unknown,
  binding: BindingV2,
): WrapperDescriptor[] {
  if (!isObject(attrs)) {
    return [];
  }
  const byType = new Map<string, Record<string, unknown>>();
  for (const k of Object.keys(attrs)) {
    if (!isWrapperAttrKey(k)) {
      continue;
    }
    const v = attrs[k];
    if (v === null || v === undefined) {
      continue;
    }
    const {type} = parseWrapperAttrKey(k);
    let entry = byType.get(type);
    if (entry === undefined) {
      entry = {};
      byType.set(type, entry);
    }
    entry[k] = v;
  }
  const descs: WrapperDescriptor[] = [];
  for (const [type, entry] of byType) {
    const spec = $getWrapperSpecForType(type, binding);
    if (spec === null || entry[WRAPPER_ATTR_PREFIX + type] !== true) {
      continue;
    }
    const declared: Record<string, unknown> = {};
    for (const k in entry) {
      const {field} = parseWrapperAttrKey(k);
      if (field === null || isDeclaredWrapperField(field, spec)) {
        declared[k] = entry[k];
      }
    }
    descs.push({
      attrs: entry,
      declaredKey: describeAttrs(type, declared),
      key: describeAttrs(type, entry),
      spec,
      type,
    });
  }
  return descs;
}

/** The declared key of an existing wrapper node, as its leaves carry it. */
function $describeWrapperNode(node: ElementNode): string {
  return describeAttrs(
    node.getType(),
    $ownWrapperAttributes(
      node,
      getWrapperSpec(node.constructor as Klass<LexicalNode>)!,
    ),
  );
}

type InlineTreeFrame = {
  readonly desc: WrapperDescriptor;
  readonly children: InlineTreeChild[];
  /** Index of the first item inside this wrapper. */
  readonly start: number;
};
type InlineTreeChild = InlineTreeFrame | number;

/**
 * The canonical wrapper tree for a flat list of leaves, as a function of the
 * Yjs state only, so every client derives the same tree:
 * - a wrapper stays open while the next leaf still carries it (adjacent equal
 *   wrappers merge);
 * - when a leaf drops a wrapper, the wrappers opened after it close too and
 *   reopen as new wrappers (a wrapper is split, never stretched);
 * - wrappers opening on the same leaf nest by the length of the range they
 *   cover (characters of text, 1 for any other leaf), longest outermost, ties
 *   by type and then value.
 */
function buildInlineTree(items: readonly InlineItem[]): InlineTreeChild[] {
  const root: InlineTreeChild[] = [];
  const stack: InlineTreeFrame[] = [];
  const keySets = items.map(item => new Set(item.wrappers.map(d => d.key)));
  const sizeOf = (i: number) => {
    const node = items[i].node;
    return $isTextNode(node) ? node.getTextContentSize() : 1;
  };
  const span = (key: string, from: number) => {
    let size = 0;
    for (let i = from; i < items.length && keySets[i].has(key); i++) {
      size += sizeOf(i);
    }
    return size;
  };
  items.forEach((item, i) => {
    let keep = 0;
    while (keep < stack.length && keySets[i].has(stack[keep].desc.key)) {
      keep++;
    }
    stack.length = keep;
    const open = new Set(stack.map(frame => frame.desc.key));
    const pending = item.wrappers.filter(d => !open.has(d.key));
    const toOpen = pending
      .map(d => ({d, size: pending.length > 1 ? span(d.key, i) : 0}))
      .sort(
        (a, b) =>
          b.size - a.size ||
          (a.d.key < b.d.key ? -1 : a.d.key > b.d.key ? 1 : 0),
      );
    for (const {d} of toOpen) {
      const frame: InlineTreeFrame = {children: [], desc: d, start: i};
      (stack.length > 0 ? stack[stack.length - 1].children : root).push(frame);
      stack.push(frame);
    }
    (stack.length > 0 ? stack[stack.length - 1].children : root).push(i);
  });
  return root;
}

/** Decodes a stored wrapper field value. */
function decodeWrapperField(
  field: string,
  value: unknown,
): {name: string; value: unknown} | null {
  if (field.startsWith(JSON_VALUE_PREFIX)) {
    if (typeof value !== 'string') {
      return null;
    }
    try {
      return {
        name: field.slice(JSON_VALUE_PREFIX.length),
        value: JSON.parse(value),
      };
    } catch (_e) {
      return null;
    }
  }
  return {name: field, value};
}

function $applyWrapperDescriptor(
  node: ElementNode,
  desc: WrapperDescriptor,
): ElementNode {
  if ($describeWrapperNode(node) === desc.declaredKey) {
    return node;
  }
  // Start from the node's own base ElementNode properties (direction, format,
  // ...), which the wrapper keys do not carry, then apply the declared fields.
  // updateFromJSON resets a schema field the JSON omits to its default, which
  // is what an omitted (default-valued) field means here.
  const current = $exportSchemaJSON(node);
  const json: Record<string, unknown> = {type: node.getType()};
  for (const k of getElementFieldNames()) {
    if (k in current) {
      json[k] = current[k];
    }
  }
  const state: Record<string, unknown> = {};
  for (const k in desc.attrs) {
    const {field} = parseWrapperAttrKey(k);
    if (field === null || !isDeclaredWrapperField(field, desc.spec)) {
      continue;
    }
    const decoded = decodeWrapperField(field, desc.attrs[k]);
    if (decoded === null || isUnsafeKey(decoded.name)) {
      continue;
    }
    if (decoded.name.startsWith(STATE_KEY_PREFIX)) {
      state[attrKeyToStateKey(decoded.name)] = decoded.value;
    } else {
      json[decoded.name] = decoded.value;
    }
  }
  const writable = node.updateFromJSON(
    json as Parameters<ElementNode['updateFromJSON']>[0],
  );
  $getWritableNodeState(writable).updateFromJSON(state);
  return writable.getLatest();
}

/**
 * Make `desired` the children of `parent`, splicing only the range between the
 * common prefix and suffix. Unlike $spliceChildren, `desired` may hold nodes
 * that currently sit deeper in the tree (inside a wrapper being replaced),
 * which a single splice detaches and moves.
 */
function $setChildren(parent: ElementNode, desired: LexicalNode[]): void {
  const current = parent.getChildren();
  let start = 0;
  while (
    start < current.length &&
    start < desired.length &&
    current[start].is(desired[start])
  ) {
    start++;
  }
  let end = 0;
  while (
    end < current.length - start &&
    end < desired.length - start &&
    current[current.length - 1 - end].is(desired[desired.length - 1 - end])
  ) {
    end++;
  }
  if (start === current.length && start === desired.length) {
    return;
  }
  parent.splice(
    start,
    current.length - start - end,
    desired.slice(start, desired.length - end),
  );
}

/** Format wrappers inside `block`, in document order. */
function $collectWrappers(block: ElementNode): ElementNode[] {
  const result: ElementNode[] = [];
  const visit = (parent: ElementNode) => {
    for (const child of parent.getChildren()) {
      if ($isFormatWrapper(child)) {
        result.push(child);
        visit(child);
      }
    }
  };
  visit(block);
  return result;
}

/**
 * Turn the canonical tree into nodes under `block` and return the block's new
 * children. Wrapper nodes are reused so their keys stay stable: first a
 * wrapper the leaf already sits in with the same type and value, then one with
 * the same type (its value is updated), then any unclaimed wrapper of the
 * block with the same type and value; only then is a node created.
 */
function $materializeInlineTree(
  block: ElementNode,
  items: readonly InlineItem[],
  binding: BindingV2,
): LexicalNode[] {
  const tree = buildInlineTree(items);
  if (tree.every(child => typeof child === 'number')) {
    return items.map(item => item.node);
  }
  const claimed = new Set<NodeKey>();
  let existing: ElementNode[] | null = null;
  const descriptions = new Map<NodeKey, string>();
  const describe = (node: ElementNode) => {
    let d = descriptions.get(node.getKey());
    if (d === undefined) {
      d = $describeWrapperNode(node);
      descriptions.set(node.getKey(), d);
    }
    return d;
  };
  const $claim = (desc: WrapperDescriptor, leaf: LexicalNode): ElementNode => {
    const chain: ElementNode[] = [];
    let parent = leaf.isAttached() ? leaf.getParent() : null;
    while (parent !== null && !parent.is(block)) {
      chain.push(parent);
      parent = parent.getParent();
    }
    const candidates = parent === null ? [] : chain;
    const unclaimedOfType = (n: ElementNode) =>
      n.getType() === desc.type && !claimed.has(n.getKey());
    let found =
      candidates.find(
        n => unclaimedOfType(n) && describe(n) === desc.declaredKey,
      ) || candidates.find(unclaimedOfType);
    if (found === undefined) {
      existing = existing || $collectWrappers(block);
      found = existing.find(
        n => unclaimedOfType(n) && describe(n) === desc.declaredKey,
      );
    }
    let node: ElementNode;
    if (found !== undefined) {
      node = found;
    } else {
      const nodeInfo = binding.editor._nodes.get(desc.type)!;
      const created = new nodeInfo.klass();
      invariant(
        created instanceof ElementNode,
        'Inline wrapper %s must be an ElementNode',
        desc.type,
      );
      node = created;
    }
    claimed.add(node.getKey());
    return $applyWrapperDescriptor(node, desc);
  };
  const $materialize = (children: InlineTreeChild[]): LexicalNode[] => {
    const result: LexicalNode[] = [];
    for (const child of children) {
      if (typeof child === 'number') {
        result.push(items[child].node);
      } else {
        const wrapper = $claim(child.desc, items[child.start].node);
        $setChildren(wrapper, $materialize(child.children));
        result.push(wrapper.getLatest());
      }
    }
    return result;
  };
  return $materialize(tree);
}

/** The flat leaves of `block` with the wrappers above each, from Lexical. */
function $collectLexicalItems(
  block: ElementNode,
  binding: BindingV2,
): InlineItem[] {
  const items: InlineItem[] = [];
  const visit = (parent: ElementNode) => {
    for (const child of parent.getChildren()) {
      if ($isFormatWrapper(child)) {
        visit(child);
      } else {
        items.push({
          node: child,
          wrappers: $parseWrapperDescriptors(
            $wrapperAttributes(child),
            binding,
          ),
        });
      }
    }
  };
  visit(block);
  return items;
}

/** Whether `block`'s wrapper tree already has the canonical shape. */
function $isCanonicalInlineTree(
  block: ElementNode,
  items: readonly InlineItem[],
): boolean {
  const $matches = (
    parent: ElementNode,
    children: InlineTreeChild[],
  ): boolean => {
    const current = parent.getChildren();
    if (current.length !== children.length) {
      return false;
    }
    return children.every((child, i) => {
      const node = current[i];
      if (typeof child === 'number') {
        return node.is(items[child].node);
      }
      return (
        $isFormatWrapper(node) &&
        $describeWrapperNode(node) === child.desc.declaredKey &&
        $matches(node, child.children)
      );
    });
  };
  return $matches(block, buildInlineTree(items));
}

/**
 * @internal The blocks among `keys` (or containing them) whose wrapper tree
 * differs from the canonical tree every client builds from the same Yjs state.
 */
export function $findNonCanonicalInlineBlocks(
  binding: BindingV2,
  keys: Iterable<NodeKey>,
): NodeKey[] {
  if (!isInlineFormatLayout(binding)) {
    return [];
  }
  const blocks = new Set<ElementNode>();
  for (const key of keys) {
    let node = $getNodeByKey(key);
    if (!(node instanceof ElementNode) || !node.isAttached()) {
      continue;
    }
    while ($isFormatWrapper(node)) {
      node = node.getParent();
    }
    if (
      node instanceof ElementNode &&
      node.getChildren().some($isFormatWrapper)
    ) {
      blocks.add(node);
    }
  }
  const result: NodeKey[] = [];
  for (const block of blocks) {
    if (!$isCanonicalInlineTree(block, $collectLexicalItems(block, binding))) {
      result.push(block.getKey());
    }
  }
  return result;
}

/**
 * Rebuild `block`'s wrapper tree in its canonical shape, reusing nodes.
 * Returns whether it changed anything.
 */
function $canonicalizeInlineBlock(
  binding: BindingV2,
  block: ElementNode,
): boolean {
  const items = $collectLexicalItems(block, binding);
  if ($isCanonicalInlineTree(block, items)) {
    return false;
  }
  $rebuildInlineChildren(block, items, binding);
  return true;
}

/**
 * Replace `block`'s children with the canonical tree for `items`. Leaves move
 * between wrappers on the way, which detaches them for a moment; ElementNode
 * splice would then move a selection point on such a leaf to a sibling, so
 * text points that still exist afterwards are put back where they were.
 */
function $rebuildInlineChildren(
  block: ElementNode,
  items: readonly InlineItem[],
  binding: BindingV2,
): void {
  const selection = $getSelection();
  const saved = $isRangeSelection(selection)
    ? [selection.anchor, selection.focus].map(point => ({
        key: point.key,
        offset: point.offset,
        type: point.type,
      }))
    : null;
  $setChildren(block, $materializeInlineTree(block, items, binding));
  const after = $getSelection();
  if (saved === null || !$isRangeSelection(after)) {
    return;
  }
  [after.anchor, after.focus].forEach((point, i) => {
    const {key, offset, type} = saved[i];
    const node = $getNodeByKey(key);
    if (
      type === 'text' &&
      $isTextNode(node) &&
      node.isAttached() &&
      offset <= node.getTextContentSize() &&
      (point.key !== key || point.offset !== offset || point.type !== type)
    ) {
      point.set(key, offset, type);
    }
  });
}

/**
 * Registers a node transform on every format wrapper class of the binding's
 * editor (found through the editor's registered nodes, never by type name).
 * It rebuilds the wrapper tree of the block around a changed wrapper in the
 * canonical shape that every client builds from the same Yjs state (e.g. one
 * link instead of two adjacent links with the same attributes), in the same
 * update as the change. Remote changes are read in that shape already.
 * Registered only once the document is marked with the inline-format layout,
 * because registering a transform marks the existing nodes of its class dirty
 * (which a binding in the default layout must not cause). Returns the
 * function that unregisters them.
 */
function registerInlineFormatTransforms(binding: BindingV2): () => void {
  const {editor} = binding;
  const unregister: (() => void)[] = [];
  // Blocks rebuilt in the current update. A block that is not canonical again
  // after its rebuild (an application transform reshapes it) is left as it is
  // instead of fighting that transform until Lexical stops the update.
  const rebuiltInUpdate = new Set<NodeKey>();
  // Blocks skipped while composing, rebuilt once the composition ends.
  const skippedWhileComposing = new Set<NodeKey>();
  for (const [, {klass}] of editor._nodes) {
    if (getWrapperSpec(klass) === null) {
      continue;
    }
    unregister.push(
      editor.registerNodeTransform(klass, node => {
        if (getLayoutState(binding) !== 'inline') {
          return;
        }
        let block: LexicalNode | null = node.getParent();
        while ($isFormatWrapper(block)) {
          block = block.getParent();
        }
        if (!(block instanceof ElementNode)) {
          return;
        }
        if (editor.isComposing()) {
          // Moving the composing TextNode would break the composition.
          skippedWhileComposing.add(block.getKey());
        } else if (!rebuiltInUpdate.has(block.getKey())) {
          if ($canonicalizeInlineBlock(binding, block)) {
            rebuiltInUpdate.add(block.getKey());
          }
        }
      }),
    );
  }
  unregister.push(
    editor.registerUpdateListener(() => {
      rebuiltInUpdate.clear();
      if (skippedWhileComposing.size > 0 && !editor.isComposing()) {
        const keys = Array.from(skippedWhileComposing);
        skippedWhileComposing.clear();
        editor.update(
          () => {
            for (const key of keys) {
              const block = $getNodeByKey(key);
              if (block instanceof ElementNode && block.isAttached()) {
                $canonicalizeInlineBlock(binding, block);
              }
            }
          },
          {tag: HISTORY_MERGE_TAG},
        );
      }
    }),
  );
  return () => unregister.forEach(fn => fn());
}
