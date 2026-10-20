/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/*
 * @experimental PROTOTYPE: the block-marker layout of the V2 binding
 * (CreateBindingV2Options__EXPERIMENTAL.blockMarkers, layout version 2). It
 * includes the inline-format layout (SyncV2.ts) and changes how blocks are
 * stored.
 *
 * Every ElementNode that is stored as a shared XmlElement (the root, and any
 * block that is not a 'line': table, row, cell, code block, ...) holds exactly
 * one Y.XmlText child, its flow. The flow is a sequence of units:
 * - a line: the inline content of a ParagraphNode, HeadingNode, ... (text runs
 *   with the inline-format layout's attributes, "\n" for line breaks, inline
 *   decorators and other inline elements as embedded XmlElements) followed by
 *   a marker: one U+2029 character whose formatting attributes describe the
 *   line: `bt` its type, `b|<field>` its schema fields (`b|~<field>` as JSON),
 *   `b|s_<key>` its NodeState and, for an item of a group (a ListItemNode),
 *   `bg` the group's type, `bg|<field>` the group's key fields and `bl` its
 *   nesting level (always written, 0 included, so that a format boundary a
 *   concurrent change drops next to an item cannot change its level). A
 *   U+2029 without a type (its formatting lost to a concurrent change) ends a
 *   paragraph in a container of lines; U+2029 typed into text is written as
 *   U+2028.
 * - an embed: any other block (an XmlElement embedded in the flow, whose own
 *   children follow the same rules) or a block decorator.
 * - a tail: inline content that is not followed by a marker, i.e. the direct
 *   inline children of the container (a code block's text).
 * Groups (ListNode) are not stored: on read, consecutive items with the same
 * group type, key fields and level are put back in one group, and a deeper
 * level in a nested group inside a wrapper item. A line is identified by the
 * Yjs id of its marker character while it exists; a split gives the first
 * part a new marker (the old one ends the second part), and a join keeps the
 * second line's marker for the merged line.
 *
 * Why a character and not an embed object: formatting a character merges per
 * key, so a concurrent heading change and indent of the same line both apply,
 * while replacing an immutable embed would duplicate the marker.
 *
 * Writing. Each flow keeps a cache of the units it holds (their content as
 * Yjs delta ops and their length) and an index from node key to unit, so the
 * position of a line is a prefix sum over the units, recomputed lazily from
 * the first unit whose length changed. A keystroke touches the one line it
 * edits: its content is diffed against the cache (one contiguous change, then
 * only the attributes that differ), costing O(line). When the container or a
 * group in it changed, the container is flattened into units and matched by
 * node key (see $syncStructure): unchanged lines are anchors no diff crosses,
 * a line whose only change is its marker gets a format of its marker, a
 * removed line is deleted exactly by its own range, and only the units of a
 * split, join or type change are diffed by characters together. So Enter
 * inserts a marker, Backspace at the start of a line deletes one, and a type,
 * list type or level change is a format change of markers. A moved block is a
 * delete and reinsert of its content.
 *
 * Reading. A remote change to a flow is located from the items its
 * transaction inserted and deleted there: each belongs to the unit whose end
 * (marker or embed, indexed by Yjs id) follows it, and a format item reaches
 * to the next format of its key. The event's delta, which Yjs computes by
 * walking the whole flow, is not used. The units the change touches are read
 * back with one item walk that starts at the end of the unit before them, and
 * rebuilt: line nodes are reused by marker id, then by order, groups and
 * wrapper items by the nodes they hold. A change that keeps the line count
 * and the group structure updates the lines in place; otherwise only the
 * changed units are read and the group items around them are regrouped from
 * the cache. Many changed items (a paste) are located in one pass.
 */

import type {BindingV2} from './Bindings';

import invariant from '@lexical/internal/invariant';
import {
  $addUpdateTag,
  $getNodeByKey,
  $getSelection,
  $getSlotNames,
  $getWritableNodeState,
  $hasUpdateTag,
  $isLineBreakNode,
  $isRangeSelection,
  $isRootOrShadowRoot,
  $isTextNode,
  type CollabBlockGroupConfig,
  ElementNode,
  getComposedSchemaFields,
  getDeclaredCollabConfig,
  getDeclaredSlots,
  getStaticNodeConfig,
  HISTORY_MERGE_TAG,
  type Klass,
  type LexicalNode,
  type NodeKey,
  ParagraphNode,
} from 'lexical';
import {
  ContentEmbed,
  ContentFormat,
  ContentString,
  ContentType,
  createID,
  type Doc as YDoc,
  findIndexSS,
  getItem,
  Item as YItem,
  iterateDeletedStructs,
  type Snapshot,
  XmlElement,
  XmlText,
  type YTextEvent,
} from 'yjs';

import {
  $createOrUpdateNodeFromYElement,
  $createSlotsYType,
  $elementAttributes,
  $exportSchemaJSON,
  $isFormatWrapper,
  $isInlineFormatOwnedKey,
  $mergeIndexOnlyDeltas,
  $parseWrapperDescriptors,
  $rebuildInlineChildren,
  $runNodeAttributes,
  $setChildren,
  $splitLineBreakDeltas,
  $syncRunNodesFromDeltas,
  $updateYFragment,
  attrKeyToStateKey,
  decodeWrapperField,
  equalAttrValues,
  type InlineItem,
  isPrimitive,
  isUnsafeKey,
  JSON_VALUE_PREFIX,
  type RunNode,
  stableStringify,
  STATE_KEY_PREFIX,
  stateToAttributes,
  type TextAttributes,
  toDelta,
  WRAPPERS_ATTR_KEY,
} from './SyncV2';
import {setSlotsAttr} from './Utils';

/** @internal The character that ends a line in a flow. */
export const MARKER_CHAR = '\u2029';
const LINE_SEPARATOR = '\u2028';
/** Tags the update that refreshes groups rebuilt by a remote read. */
const BLOCK_REFRESH_TAG = 'collab-block-refresh';
const BT = 'bt';
const BL = 'bl';
const BG = 'bg';
// On a block embed (an XmlElement embedded as a unit, not as inline content).
const BE = 'be';
const FIELD_PREFIX = 'b|';
const GROUP_FIELD_PREFIX = 'bg|';

const isBlockAttrKey = (k: string): boolean =>
  k === BT ||
  k === BL ||
  k === BG ||
  k === BE ||
  k.startsWith(FIELD_PREFIX) ||
  k.startsWith(GROUP_FIELD_PREFIX);

type Attrs = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Declarations

type LineSpec = {readonly fields: ReadonlySet<string>};
type GroupSpec = {
  readonly items: readonly Klass<LexicalNode>[];
  readonly key: readonly string[];
  readonly nested: boolean;
  readonly derived: ReadonlySet<string>;
};

const lineSpecs = new WeakMap<Klass<LexicalNode>, LineSpec | null>();
const groupSpecs = new WeakMap<Klass<LexicalNode>, GroupSpec | null>();
const EMPTY_SET: ReadonlySet<string> = new Set();

const hasOwn = (obj: object, key: string) =>
  Object.prototype.hasOwnProperty.call(obj, key);

/**
 * Whether everything a node of `klass` holds is in its serialization schema
 * and NodeState, which is all a marker stores. The class that declares the
 * block hint is trusted; every subclass below it must declare its own
 * `$config()` (so its fields are in the schema) and must not hand-write
 * `exportJSON` or `updateFromJSON` (which can carry other properties).
 */
function isSchemaComplete(klass: Klass<LexicalNode>): boolean {
  for (
    let k: Klass<LexicalNode> | null = klass;
    k !== null && k !== ElementNode;
    k = Object.getPrototypeOf(k) as Klass<LexicalNode> | null
  ) {
    const {ownNodeConfig} = getStaticNodeConfig(k);
    if (
      ownNodeConfig !== undefined &&
      ownNodeConfig.collab !== undefined &&
      ownNodeConfig.collab.block !== undefined
    ) {
      return true;
    }
    if (
      ownNodeConfig === undefined ||
      hasOwn(k.prototype, 'exportJSON') ||
      hasOwn(k.prototype, 'updateFromJSON')
    ) {
      return false;
    }
  }
  return false;
}

/**
 * The block hint of `klass` that the block-marker layout can honor: a
 * declared `'line'` or group, on an ElementNode whose serialization is
 * schema-complete, with valid group settings. Anything else is stored as a
 * node, with a development warning when a declared hint is not honored.
 * Validation happens here, only in the block-marker layout, never in core.
 */
function honoredBlockHint(
  klass: Klass<LexicalNode>,
): 'line' | CollabBlockGroupConfig | null {
  const block = getDeclaredCollabConfig(klass).block;
  if (block === undefined || block === 'node') {
    return null;
  }
  const name = klass.name || 'node class';
  if (!(klass.prototype instanceof ElementNode)) {
    warnOnce(
      `@lexical/yjs: ${name} declares collab.block but is not an ElementNode; it is stored as a node.`,
    );
    return null;
  }
  if (!isSchemaComplete(klass)) {
    warnOnce(
      `@lexical/yjs: ${name} inherits collab.block but does not declare its own $config() (or hand-writes exportJSON/updateFromJSON), so properties outside its schema could be lost; it is stored as a node.`,
    );
    return null;
  }
  if (block === 'line') {
    if (getDeclaredSlots(klass).length > 0) {
      warnOnce(
        `@lexical/yjs: ${name} declares collab.block "line" and slots; a line cannot host slots, so it is stored as a node.`,
      );
      return null;
    }
    return 'line';
  }
  if (
    typeof block !== 'object' ||
    block === null ||
    block.mode !== 'group' ||
    !Array.isArray(block.key) ||
    block.key.length === 0 ||
    typeof block.items !== 'function'
  ) {
    warnOnce(
      `@lexical/yjs: ${name} declares a collab.block group without key fields or items; it is stored as a node.`,
    );
    return null;
  }
  return block;
}

function getLineSpec(klass: Klass<LexicalNode>): LineSpec | null {
  let spec = lineSpecs.get(klass);
  if (spec === undefined) {
    spec =
      honoredBlockHint(klass) === 'line'
        ? {fields: new Set(Object.keys(getComposedSchemaFields(klass)))}
        : null;
    lineSpecs.set(klass, spec);
  }
  return spec;
}

function getGroupSpec(klass: Klass<LexicalNode>): GroupSpec | null {
  let spec = groupSpecs.get(klass);
  if (spec === undefined) {
    const block = honoredBlockHint(klass);
    spec = null;
    if (block !== null && block !== 'line') {
      const items = block.items();
      const invalid = items.filter(item => getLineSpec(item) === null);
      if (invalid.length > 0 || items.length === 0) {
        warnOnce(
          `@lexical/yjs: the items of the collab.block group ${klass.name} must be lines; it is stored as a node.`,
        );
      } else {
        spec = {
          derived: new Set(block.derived || []),
          items,
          key: block.key,
          nested: block.nested === true,
        };
      }
    }
    groupSpecs.set(klass, spec);
  }
  return spec;
}

const klassOf = (node: LexicalNode) => node.constructor as Klass<LexicalNode>;

const warned = new Set<string>();
function warnOnce(message: string): void {
  if (process.env.NODE_ENV !== 'production' && !warned.has(message)) {
    warned.add(message);
    console.warn(message);
  }
}

const $isInlineChild = (n: LexicalNode): boolean =>
  $isTextNode(n) || $isLineBreakNode(n) || n.isInline();

/** A node stored as a line: declared, block, no slots, inline children. */
function $isValidLine(node: LexicalNode): node is ElementNode {
  if (
    !(node instanceof ElementNode) ||
    node.isInline() ||
    getLineSpec(klassOf(node)) === null
  ) {
    return false;
  }
  if ($getSlotNames(node).length > 0) {
    warnOnce(
      `@lexical/yjs: a ${node.getType()} declared collab.block "line" hosts slots; it is stored as a node.`,
    );
    return false;
  }
  for (let c = node.getFirstChild(); c !== null; c = c.getNextSibling()) {
    if (!$isInlineChild(c)) {
      warnOnce(
        `@lexical/yjs: a ${node.getType()} declared collab.block "line" has a block child; it is stored as a node.`,
      );
      return false;
    }
  }
  return true;
}

/** The nested group an item holds when it is only a nesting level. */
function $getNestedGroup(
  item: LexicalNode,
  group: ElementNode,
): ElementNode | null {
  if (!(item instanceof ElementNode)) {
    return null;
  }
  const first = item.getFirstChild();
  return first !== null &&
    first === item.getLastChild() &&
    first instanceof ElementNode &&
    first.constructor === group.constructor
    ? first
    : null;
}

// ---------------------------------------------------------------------------
// Write context

type WriteContext = {
  readonly prev: ReadonlyMap<NodeKey, LexicalNode>;
};
let writeContext: WriteContext | null = null;

/**
 * @internal Set by the V2 write path around a block-layout write: the
 * previous node map tells which nodes were written in the update.
 */
export function setBlockLayoutWriteContext(
  prev: ReadonlyMap<NodeKey, LexicalNode> | null,
): void {
  writeContext = prev === null ? null : {prev};
}

/** Whether `node` was written (or created) in the update being synced. */
function $isChanged(node: LexicalNode): boolean {
  return (
    writeContext === null ||
    writeContext.prev.get(node.getKey()) !== node.getLatest()
  );
}

// ---------------------------------------------------------------------------
// Units

type DesiredUnit =
  | {
      readonly kind: 'line';
      readonly key: NodeKey;
      readonly node: ElementNode;
      readonly group: ElementNode | null;
      readonly level: number;
      readonly groupChanged: boolean;
    }
  | {readonly kind: 'embed'; readonly key: NodeKey; readonly node: LexicalNode}
  | {
      readonly kind: 'tail';
      readonly key: NodeKey;
      readonly nodes: LexicalNode[];
    };

/** A unit as the flow holds it. */
type Unit = {
  kind: 'line' | 'embed' | 'tail';
  /** Line or embed node key, or the key of a tail's first node. */
  key: NodeKey;
  /** Every node key this unit is indexed under (a tail: all its nodes). */
  keys: NodeKey[];
  ops: Op[];
  len: number;
  start: number;
  index: number;
  /** Yjs id of the line's marker character, when known. */
  markerId: string | null;
  /** A line whose marker names a group. */
  groupItem: boolean;
  flow: FlowState;
};

type Op = {insert: string | XmlElement | object; attributes: Attrs};

type FlowState = {
  readonly text: XmlText;
  readonly container: ContainerState;
  units: Unit[];
  /** Units before this index have a valid `start` and `index`. */
  validUpTo: number;
  /** Units by the Yjs id of the item that ends them (marker or embed). */
  byEnd: Map<string, Unit>;
  /** Units that should end with a known item but whose id is unknown. */
  unknownEnds: number;
};

type ContainerState = {
  readonly el: XmlElement;
  flows: FlowState[];
  byKey: Map<NodeKey, Unit>;
};

type Store = {
  containers: WeakMap<XmlElement, ContainerState>;
  flows: WeakMap<XmlText, FlowState>;
  /** Groups rebuilt by a remote read, refreshed by a follow-up update. */
  refresh: Set<NodeKey>;
};
const stores = new WeakMap<BindingV2, Store>();

function getStore(binding: BindingV2): Store {
  let store = stores.get(binding);
  if (store === undefined) {
    store = {
      containers: new WeakMap(),
      flows: new WeakMap(),
      refresh: new Set(),
    };
    stores.set(binding, store);
  }
  return store;
}

/** @internal Drops the cached flows of `binding` (a full re-read follows). */
export function resetBlockLayoutState(binding: BindingV2): void {
  stores.delete(binding);
}

const opLength = (op: Op): number =>
  typeof op.insert === 'string' ? op.insert.length : 1;

function startOf(flow: FlowState, unit: Unit): number {
  if (unit.index < flow.validUpTo && flow.units[unit.index] === unit) {
    return unit.start;
  }
  const {units} = flow;
  for (let i = flow.validUpTo; i < units.length; i++) {
    const u = units[i];
    u.index = i;
    u.start = i === 0 ? 0 : units[i - 1].start + units[i - 1].len;
    flow.validUpTo = i + 1;
    if (u === unit) {
      return u.start;
    }
  }
  invariant(false, 'Block layout: unit is not in its flow');
}

function flowLength(flow: FlowState): number {
  const {units} = flow;
  if (units.length === 0) {
    return 0;
  }
  const last = units[units.length - 1];
  return startOf(flow, last) + last.len;
}

function indexUnit(cs: ContainerState, unit: Unit): void {
  for (const key of unit.keys) {
    cs.byKey.set(key, unit);
  }
}

function unindexUnit(cs: ContainerState, unit: Unit): void {
  for (const key of unit.keys) {
    if (cs.byKey.get(key) === unit) {
      cs.byKey.delete(key);
    }
  }
}

const idString = (id: {client: number; clock: number}) =>
  `${id.client}:${id.clock}`;

/**
 * The Yjs id of the item that ends a unit: its marker, or its embed. Null for
 * a unit nothing ends (a tail, an implicit line) and for one whose end is not
 * known yet (written into a flow that was not part of the document).
 */
function unitEndId(unit: Unit): string | null | undefined {
  if (unit.kind === 'embed') {
    const el = unit.ops.length > 0 ? unit.ops[0].insert : null;
    return el instanceof XmlElement && el._item !== null
      ? idString(el._item.id)
      : undefined;
  }
  if (unit.kind === 'line' && markerOf(unit) !== null) {
    return unit.markerId === null ? undefined : unit.markerId;
  }
  return null;
}

function addEnd(flow: FlowState, unit: Unit): void {
  const id = unitEndId(unit);
  if (id === undefined) {
    flow.unknownEnds++;
  } else if (id !== null) {
    flow.byEnd.set(id, unit);
  }
}

function removeEnd(flow: FlowState, unit: Unit): void {
  const id = unitEndId(unit);
  if (id === undefined) {
    flow.unknownEnds--;
  } else if (id !== null && flow.byEnd.get(id) === unit) {
    flow.byEnd.delete(id);
  }
}

/** Indexes units assigned to a flow in bulk. */
function indexFlow(flow: FlowState): void {
  flow.byEnd.clear();
  flow.unknownEnds = 0;
  flow.validUpTo = 0;
  for (const u of flow.units) {
    u.flow = flow;
    addEnd(flow, u);
  }
}

/** Replaces `count` units of `flow` at `at` with `next`. */
function spliceUnits(
  flow: FlowState,
  at: number,
  count: number,
  next: Unit[],
): void {
  const removed = flow.units.splice(at, count, ...next);
  for (const u of removed) {
    unindexUnit(flow.container, u);
    removeEnd(flow, u);
  }
  for (const u of next) {
    u.flow = flow;
    indexUnit(flow.container, u);
    addEnd(flow, u);
  }
  flow.validUpTo = Math.min(flow.validUpTo, at);
}

// ---------------------------------------------------------------------------
// Marker attributes

function putField(
  attrs: Attrs,
  prefix: string,
  field: string,
  value: unknown,
): void {
  if (value === undefined) {
    return;
  }
  if (isPrimitive(value)) {
    attrs[prefix + field] = value;
  } else {
    attrs[prefix + JSON_VALUE_PREFIX + field] = stableStringify(value);
  }
}

const fieldName = (rest: string) =>
  rest.startsWith(JSON_VALUE_PREFIX)
    ? rest.slice(JSON_VALUE_PREFIX.length)
    : rest;

function $markerAttributes(
  line: ElementNode,
  group: ElementNode | null,
  level: number,
): Attrs {
  const attrs: Attrs = {[BT]: line.getType()};
  const spec = getLineSpec(klassOf(line));
  const gspec = group === null ? null : getGroupSpec(klassOf(group));
  const derived = gspec === null ? EMPTY_SET : gspec.derived;
  const json = $exportSchemaJSON(line.getLatest());
  if (spec !== null) {
    for (const field of spec.fields) {
      if (!derived.has(field)) {
        putField(attrs, FIELD_PREFIX, field, json[field]);
      }
    }
  }
  const state = stateToAttributes(line.getLatest());
  for (const k in state) {
    putField(attrs, FIELD_PREFIX, k, state[k]);
  }
  if (group !== null && gspec !== null) {
    attrs[BG] = group.getType();
    const gjson = $exportSchemaJSON(group.getLatest());
    for (const field of gspec.key) {
      putField(attrs, GROUP_FIELD_PREFIX, field, gjson[field]);
    }
    // Always explicit, 0 included: the level of every item is then set by
    // its own format item, so a format boundary that a concurrent change
    // drops next to a neighbour cannot change the level of an item nobody
    // edited.
    attrs[BL] = level;
  }
  return attrs;
}

function specOfType(type: unknown, binding: BindingV2): LineSpec | null {
  if (typeof type !== 'string') {
    return null;
  }
  const info = binding.editor._nodes.get(type);
  return info === undefined ? null : getLineSpec(info.klass);
}

function groupSpecOfType(type: unknown, binding: BindingV2): GroupSpec | null {
  if (typeof type !== 'string') {
    return null;
  }
  const info = binding.editor._nodes.get(type);
  return info === undefined ? null : getGroupSpec(info.klass);
}

/**
 * Whether the binding owns `key` on a marker (and so may change or remove
 * it): its type, level and group, the fields of its type (current or
 * desired) and its NodeState. Unknown fields (a newer peer's) and inline keys
 * a concurrent format put on the marker are left alone.
 */
function isMarkerOwnedKey(
  key: string,
  desired: Attrs,
  current: Attrs,
  binding: BindingV2,
): boolean {
  if (key === BT || key === BL || key === BG) {
    return true;
  }
  if (key.startsWith(GROUP_FIELD_PREFIX)) {
    const field = fieldName(key.slice(GROUP_FIELD_PREFIX.length));
    const spec = groupSpecOfType(desired[BG], binding);
    return spec === null || spec.key.includes(field);
  }
  if (key.startsWith(FIELD_PREFIX)) {
    const field = fieldName(key.slice(FIELD_PREFIX.length));
    if (field.startsWith(STATE_KEY_PREFIX)) {
      return true;
    }
    for (const type of [desired[BT], current[BT]]) {
      const spec = specOfType(type, binding);
      if (spec !== null && spec.fields.has(field)) {
        return true;
      }
    }
  }
  return false;
}

function isTextOwnedKey(
  key: string,
  desired: Attrs,
  binding: BindingV2,
): boolean {
  return (
    key !== 'ychange' &&
    (isBlockAttrKey(key) || $isInlineFormatOwnedKey(key, desired, binding))
  );
}

// ---------------------------------------------------------------------------
// Flattening a container into units

function $flattenGroup(
  group: ElementNode,
  level: number,
  changed: boolean,
  out: DesiredUnit[],
  cs: ContainerState | null = null,
): boolean {
  const spec = getGroupSpec(klassOf(group));
  if (spec === null || group.getChildrenSize() === 0) {
    return false;
  }
  const start = out.length;
  const groupChanged = changed || $isChanged(group);
  for (let item = group.getFirstChild(); item; item = item.getNextSibling()) {
    if (!spec.items.some(k => item instanceof k)) {
      out.length = start;
      return false;
    }
    const nested = spec.nested ? $getNestedGroup(item, group) : null;
    if (nested !== null) {
      if (
        !$flattenGroup(
          nested,
          level + 1,
          groupChanged || $isChanged(item),
          out,
          cs,
        )
      ) {
        out.length = start;
        return false;
      }
    } else if ($isKnownLine(item, cs) || $isValidLine(item)) {
      out.push({
        group,
        groupChanged,
        key: item.getKey(),
        kind: 'line',
        level,
        node: item,
      });
    } else {
      out.length = start;
      return false;
    }
  }
  return true;
}

/**
 * A line the cache holds as a line and that was not written in this update:
 * still a valid line, without walking its children again.
 */
function $isKnownLine(
  node: LexicalNode,
  cs: ContainerState | null,
): node is ElementNode {
  if (cs === null || $isChanged(node)) {
    return false;
  }
  const unit = cs.byKey.get(node.getKey());
  return unit !== undefined && unit.kind === 'line';
}

function $flattenContainer(
  container: ElementNode,
  cs: ContainerState | null = null,
): DesiredUnit[] {
  const out: DesiredUnit[] = [];
  let tail: LexicalNode[] | null = null;
  for (let c = container.getFirstChild(); c !== null; c = c.getNextSibling()) {
    if ($isInlineChild(c)) {
      if (tail === null) {
        tail = [];
        out.push({key: c.getKey(), kind: 'tail', nodes: tail});
      }
      tail.push(c);
      continue;
    }
    tail = null;
    if ($isKnownLine(c, cs) || $isValidLine(c)) {
      out.push({
        group: null,
        groupChanged: false,
        key: c.getKey(),
        kind: 'line',
        level: 0,
        node: c,
      });
    } else if (
      !(
        c instanceof ElementNode &&
        getGroupSpec(klassOf(c)) !== null &&
        $flattenGroup(c, 0, false, out, cs)
      )
    ) {
      out.push({key: c.getKey(), kind: 'embed', node: c});
    }
  }
  return out;
}

/** The desired unit of a line found by key (the non-structural path). */
function $lineUnitOf(line: ElementNode): DesiredUnit | null {
  if (!$isValidLine(line)) {
    return null;
  }
  let level = 0;
  let group: ElementNode | null = null;
  const parent = line.getParent();
  if (isGroupNode(parent)) {
    group = parent;
    // Each wrapper item (an item holding only a nested group of the same
    // class) above the line's group is one level.
    let g: ElementNode = parent;
    for (;;) {
      const wrapper: ElementNode | null = g.getParent();
      const outer: ElementNode | null =
        wrapper === null ? null : wrapper.getParent();
      if (
        wrapper === null ||
        outer === null ||
        $getNestedGroup(wrapper, g) !== g ||
        outer.constructor !== g.constructor
      ) {
        break;
      }
      level++;
      g = outer;
    }
  }
  return {
    group,
    groupChanged: false,
    key: line.getKey(),
    kind: 'line',
    level,
    node: line,
  };
}

// ---------------------------------------------------------------------------
// Desired content

type EmbedRef = {readonly node: LexicalNode; readonly el: XmlElement | null};
type AtomKind = 'text' | 'marker' | 'embed';
type DAtom = {v: string | EmbedRef; a: Attrs; kind: AtomKind};
type Atom = {v: string | XmlElement | object; a: Attrs; id?: string};

function embedRef(node: LexicalNode, binding: BindingV2): EmbedRef {
  const el = binding.mapping.getSharedType(node);
  return {el: el instanceof XmlElement ? el : null, node};
}

/**
 * Appends the atoms of inline content (format wrappers are transparent, as in
 * the inline-format layout) and records the first atom of each node.
 */
function $pushInlineAtoms(
  children: Iterable<LexicalNode>,
  binding: BindingV2,
  out: DAtom[],
  firstAtom: Map<NodeKey, number>,
): void {
  let runIndex = 0;
  const visit = (nodes: Iterable<LexicalNode>) => {
    for (const child of nodes) {
      firstAtom.set(child.getKey(), out.length);
      if ($isTextNode(child) || $isLineBreakNode(child)) {
        const a = $runNodeAttributes(child as RunNode, binding);
        if (runIndex > 0) {
          a.i = runIndex;
        }
        runIndex++;
        // U+2029 ends a line in a flow; in text it is written as U+2028
        // (and the local text is changed to match, see
        // registerBlockLayoutTransforms).
        const text = child.getTextContent();
        for (let i = 0; i < text.length; i++) {
          out.push({
            a,
            kind: 'text',
            v: text[i] === MARKER_CHAR ? LINE_SEPARATOR : text[i],
          });
        }
      } else if ($isFormatWrapper(child)) {
        visit(child.getChildren());
      } else {
        runIndex = 0;
        out.push({a: {}, kind: 'embed', v: embedRef(child, binding)});
      }
    }
  };
  visit(children);
}

function $desiredAtoms(
  unit: DesiredUnit,
  binding: BindingV2,
  out: DAtom[],
  firstAtom: Map<NodeKey, number>,
): void {
  firstAtom.set(unit.key, out.length);
  if (unit.kind === 'embed') {
    out.push({a: {[BE]: true}, kind: 'embed', v: embedRef(unit.node, binding)});
  } else if (unit.kind === 'tail') {
    $pushInlineAtoms(unit.nodes, binding, out, firstAtom);
  } else {
    $pushInlineAtoms(unit.node.getChildren(), binding, out, firstAtom);
    out.push({
      a: $markerAttributes(unit.node, unit.group, unit.level),
      kind: 'marker',
      v: MARKER_CHAR,
    });
    firstAtom.set(unit.key, Math.min(firstAtom.get(unit.key)!, out.length - 1));
  }
}

function unitAtoms(unit: Unit, out: Atom[]): void {
  for (const op of unit.ops) {
    if (typeof op.insert === 'string') {
      for (let i = 0; i < op.insert.length; i++) {
        out.push({a: op.attributes, v: op.insert[i]});
      }
    } else {
      out.push({a: op.attributes, v: op.insert});
    }
  }
  if (unit.kind === 'line' && unit.markerId !== null && out.length > 0) {
    out[out.length - 1].id = unit.markerId;
  }
}

function atomsToOps(atoms: Atom[], from: number, to: number): Op[] {
  const ops: Op[] = [];
  for (let i = from; i < to; i++) {
    const atom = atoms[i];
    const last = ops[ops.length - 1];
    if (
      typeof atom.v === 'string' &&
      last !== undefined &&
      typeof last.insert === 'string' &&
      (last.attributes === atom.a || equalAttrValues(last.attributes, atom.a))
    ) {
      last.insert += atom.v;
    } else {
      ops.push({attributes: atom.a, insert: atom.v});
    }
  }
  return ops;
}

const sameAtom = (o: Atom, n: DAtom): boolean =>
  typeof o.v === 'string'
    ? typeof n.v === 'string' && o.v === n.v
    : typeof n.v !== 'string' && n.v.el !== null && n.v.el === o.v;

function withoutNulls(attrs: Attrs): Attrs {
  const result: Attrs = {};
  for (const k in attrs) {
    if (attrs[k] !== null && attrs[k] !== undefined) {
      result[k] = attrs[k];
    }
  }
  return result;
}

/** The attribute changes that turn `current` into `desired` on one atom. */
function attributeChanges(
  kind: AtomKind,
  current: Attrs,
  desired: Attrs,
  binding: BindingV2,
): Attrs | null {
  if (kind === 'embed') {
    return null;
  }
  let changes: Attrs | null = null;
  for (const key in current) {
    if (
      !Object.prototype.hasOwnProperty.call(desired, key) &&
      (kind === 'marker'
        ? isMarkerOwnedKey(key, desired, current, binding)
        : isTextOwnedKey(key, desired, binding))
    ) {
      (changes || (changes = {}))[key] = null;
    }
  }
  for (const key in desired) {
    if (!equalAttrValues(current[key] ?? null, desired[key] ?? null)) {
      (changes || (changes = {}))[key] = desired[key] ?? null;
    }
  }
  return changes;
}

function markerIdOfLastInsert(doc: YDoc): string | null {
  const structs = doc.store.clients.get(doc.clientID);
  if (structs === undefined) {
    return null;
  }
  for (let i = structs.length - 1; i >= 0 && i >= structs.length - 64; i--) {
    const struct = structs[i] as YItem;
    const content = struct.content;
    if (content instanceof ContentString) {
      const offset = content.str.lastIndexOf(MARKER_CHAR);
      if (offset !== -1) {
        return `${struct.id.client}:${struct.id.clock + offset}`;
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Writing a range of units

/**
 * Rewrites the units `oldUnits` (contiguous in one flow, possibly none) as
 * `desired`: one contiguous insert/delete found by diffing their content
 * (biased to the selection), then only the attributes that differ.
 */
type FormatOp = {pos: number; len: number; attrs: Attrs};

/** Above this many insertions, a region is inserted with one delta. */
const FEW_INSERTS = 8;

/**
 * Applies format operations (absolute positions, ascending, not
 * overlapping) as one delta: one pass over the flow instead of one position
 * lookup per operation.
 */
function applyFormats(text: XmlText, formats: FormatOp[]): void {
  if (formats.length === 0) {
    return;
  }
  const delta: {retain: number; attributes?: Attrs}[] = [];
  let cursor = 0;
  for (const {pos, len, attrs} of formats) {
    if (pos > cursor) {
      delta.push({retain: pos - cursor});
    }
    delta.push({attributes: {...attrs}, retain: len});
    cursor = pos + len;
  }
  text.applyDelta(delta);
}

function $applyRegion(
  cs: ContainerState,
  flow: FlowState,
  oldUnits: Unit[],
  at: number,
  desired: DesiredUnit[],
  binding: BindingV2,
  dirty: Set<NodeKey>,
  // Collects the region's format operations to apply later (the caller
  // processes regions left to right, so their positions stay valid);
  // without it they are applied at the end of the region.
  formats: FormatOp[] | null = null,
): Unit[] {
  const regionFormats: FormatOp[] = formats === null ? [] : formats;
  const text = flow.text;
  // `at` is the index in the flow of the first old unit (or where the new
  // units go).
  const position =
    at < flow.units.length ? startOf(flow, flow.units[at]) : flowLength(flow);
  const oldAtoms: Atom[] = [];
  for (const u of oldUnits) {
    unitAtoms(u, oldAtoms);
  }
  const newAtoms: DAtom[] = [];
  const firstAtom = new Map<NodeKey, number>();
  const bounds: number[] = [];
  for (const u of desired) {
    $desiredAtoms(u, binding, newAtoms, firstAtom);
    bounds.push(newAtoms.length);
  }

  // Cursor bias, as in the default layout's text diff.
  let cursor = newAtoms.length;
  const selection = $getSelection();
  if ($isRangeSelection(selection) && selection.isCollapsed()) {
    const first = firstAtom.get(selection.anchor.key);
    if (first !== undefined) {
      cursor =
        first +
        (selection.anchor.type === 'text' ? selection.anchor.offset : 0);
    }
  }
  let left = 0;
  let right = 0;
  const oLen = oldAtoms.length;
  const nLen = newAtoms.length;
  // Content that no marker ends (the end of a flow, typed into a removed
  // line) gets its marker appended rather than diffed: the diff would
  // otherwise match the content's end against the new marker and rewrite
  // the content instead of keeping it.
  const lastOld = oldUnits.length > 0 ? oldUnits[oldUnits.length - 1] : null;
  const appendMarker =
    lastOld !== null &&
    lastOld.kind !== 'embed' &&
    markerOf(lastOld) === null &&
    nLen > 0 &&
    newAtoms[nLen - 1].kind === 'marker';
  const nD = appendMarker ? nLen - 1 : nLen;
  while (
    left < oLen &&
    left < nD &&
    left < cursor &&
    sameAtom(oldAtoms[left], newAtoms[left])
  ) {
    left++;
  }
  while (
    right + left < oLen &&
    right + left < nD &&
    sameAtom(oldAtoms[oLen - right - 1], newAtoms[nD - right - 1])
  ) {
    right++;
  }
  while (
    right + left < oLen &&
    right + left < nD &&
    sameAtom(oldAtoms[left], newAtoms[left])
  ) {
    left++;
  }
  const remove = oLen - left - right;
  if (remove > 0) {
    for (let i = left; i < left + remove; i++) {
      const v = oldAtoms[i].v;
      if (v instanceof XmlElement) {
        binding.mapping.delete(v);
      }
    }
    text.delete(position + left, remove);
  }
  const atoms: Atom[] = oldAtoms.slice(0, left);
  const inherited: Attrs =
    left > 0 ? oldAtoms[left - 1].a : $attrsBefore(flow, at);
  // The insertions, as pieces: runs of text with one set of attributes,
  // markers and embeds.
  type Piece = {insert: string | XmlElement; attrs: Attrs; marker: boolean};
  const pieces: Piece[] = [];
  for (let i = left; i < nD - right; ) {
    const d = newAtoms[i];
    if (d.kind === 'text') {
      let j = i + 1;
      let str = d.v as string;
      while (
        j < nD - right &&
        newAtoms[j].kind === 'text' &&
        newAtoms[j].a === d.a
      ) {
        str += newAtoms[j].v as string;
        j++;
      }
      const attrs: Attrs = {};
      for (const k in inherited) {
        if (!isTextOwnedKey(k, d.a, binding)) {
          attrs[k] = inherited[k];
        }
      }
      Object.assign(attrs, d.a);
      pieces.push({attrs, insert: str, marker: false});
      const a = withoutNulls(attrs);
      for (let k = i; k < j; k++) {
        atoms.push({a, v: newAtoms[k].v as string});
      }
      i = j;
    } else if (d.kind === 'marker') {
      pieces.push({attrs: d.a, insert: MARKER_CHAR, marker: true});
      atoms.push({a: withoutNulls(d.a), v: MARKER_CHAR});
      i++;
    } else {
      const el = $createFlowElementType((d.v as EmbedRef).node, binding);
      pieces.push({attrs: d.a, insert: el, marker: false});
      atoms.push({a: withoutNulls(d.a), v: el});
      i++;
    }
  }
  const insertAt = position + left;
  if (pieces.length <= FEW_INSERTS || text.doc === null) {
    // A few insertions (typing, Enter): one call each, and the id of each
    // new marker is read right after it is inserted.
    let pos = insertAt;
    let atom = left;
    for (const piece of pieces) {
      if (typeof piece.insert === 'string') {
        text.insert(pos, piece.insert, {...piece.attrs});
        if (piece.marker) {
          const id = text.doc === null ? null : markerIdOfLastInsert(text.doc);
          if (id !== null) {
            atoms[atom].id = id;
          }
        }
        pos += piece.insert.length;
        atom += piece.insert.length;
      } else {
        text.insertEmbed(pos, piece.insert, {...piece.attrs});
        pos++;
        atom++;
      }
    }
  } else {
    // Many insertions (a paste, a new document): one delta, one pass over
    // the flow, then the ids of the new markers are read back in one walk.
    const delta: {
      retain?: number;
      insert?: string | XmlElement;
      attributes?: Attrs;
    }[] = [];
    if (insertAt > 0) {
      delta.push({retain: insertAt});
    }
    let length = 0;
    for (const piece of pieces) {
      delta.push({attributes: {...piece.attrs}, insert: piece.insert});
      length += typeof piece.insert === 'string' ? piece.insert.length : 1;
    }
    text.applyDelta(delta, {sanitize: false});
    const ops = readFlowRange(text, insertAt, insertAt + length);
    let atom = left;
    for (const op of ops) {
      if (op.id !== undefined && atoms[atom] !== undefined) {
        atoms[atom].id = op.id;
      }
      atom += opLength(op);
    }
  }
  for (let i = oLen - right; i < oLen; i++) {
    atoms.push(oldAtoms[i]);
  }
  if (appendMarker) {
    const d = newAtoms[nLen - 1];
    text.insert(position + nD, MARKER_CHAR, {...d.a});
    const id = text.doc === null ? null : markerIdOfLastInsert(text.doc);
    atoms.push({
      a: withoutNulls(d.a),
      id: id === null ? undefined : id,
      v: MARKER_CHAR,
    });
  }

  // Attributes, and retained embeds whose node changed.
  for (let i = 0; i < nLen; ) {
    const d = newAtoms[i];
    if (d.kind === 'embed') {
      const atom = atoms[i];
      if (
        (i < left || i >= nLen - right) &&
        atom.v instanceof XmlElement &&
        dirty.has((d.v as EmbedRef).node.getKey())
      ) {
        $updateYFragment(
          text.doc as YDoc,
          atom.v,
          (d.v as EmbedRef).node.getLatest(),
          binding,
          dirty,
        );
      }
      i++;
      continue;
    }
    const changes = attributeChanges(d.kind, atoms[i].a, d.a, binding);
    if (changes === null) {
      i++;
      continue;
    }
    let j = i + 1;
    while (j < nLen && newAtoms[j].kind !== 'embed') {
      const next = attributeChanges(
        newAtoms[j].kind,
        atoms[j].a,
        newAtoms[j].a,
        binding,
      );
      if (next === null || !equalAttrValues(next, changes)) {
        break;
      }
      j++;
    }
    regionFormats.push({attrs: changes, len: j - i, pos: position + i});
    for (let k = i; k < j; k++) {
      const a = {...atoms[k].a};
      for (const key in changes) {
        if (changes[key] === null) {
          delete a[key];
        } else {
          a[key] = changes[key];
        }
      }
      atoms[k] = {...atoms[k], a};
    }
    i = j;
  }

  // The new units.
  const units: Unit[] = [];
  let from = 0;
  desired.forEach((u, n) => {
    const to = bounds[n];
    const ops = atomsToOps(atoms, from, to);
    let len = 0;
    for (const op of ops) {
      len += opLength(op);
    }
    const last = atoms[to - 1];
    units.push({
      flow,
      groupItem: u.kind === 'line' && u.group !== null,
      index: 0,
      key: u.key,
      keys: u.kind === 'tail' ? u.nodes.map(n2 => n2.getKey()) : [u.key],
      kind: u.kind,
      len,
      markerId:
        u.kind === 'line' && last !== undefined && last.id !== undefined
          ? last.id
          : null,
      ops,
      start: 0,
    });
    from = to;
  });
  spliceUnits(flow, at, oldUnits.length, units);
  if (formats === null) {
    applyFormats(text, regionFormats);
  }
  return units;
}

/** The attributes of the atom before a region (none at the flow start). */
function $attrsBefore(flow: FlowState, at: number): Attrs {
  const prev = at > 0 ? flow.units[at - 1] : null;
  if (prev === null || prev.ops.length === 0) {
    return {};
  }
  return prev.ops[prev.ops.length - 1].attributes;
}

// ---------------------------------------------------------------------------
// Creating and updating containers

function newFlowState(text: XmlText, cs: ContainerState): FlowState {
  return {
    byEnd: new Map(),
    container: cs,
    text,
    units: [],
    unknownEnds: 0,
    validUpTo: 0,
  };
}

/**
 * @internal The shared type of a node in the block-marker layout: an
 * XmlElement with the node's attributes and slots and, for an ElementNode,
 * one flow holding its children. Every such element is mapped (decorators
 * included), so that it can be matched as an embed.
 */
export function $createFlowElementType(
  node: LexicalNode,
  binding: BindingV2,
): XmlElement {
  const el = new XmlElement(node.getType());
  const attrs = $elementAttributes(node, binding);
  for (const key in attrs) {
    const val = attrs[key];
    if (val !== null) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      el.setAttribute(key, val as any);
    }
  }
  const slotsY = $createSlotsYType(node, binding);
  if (slotsY !== undefined) {
    setSlotsAttr(el, slotsY);
  }
  binding.mapping.set(el, node);
  if (!(node instanceof ElementNode)) {
    return el;
  }
  const text = new XmlText();
  el.insert(0, [text]);
  const store = getStore(binding);
  const cs: ContainerState = {byKey: new Map(), el, flows: []};
  const flow = newFlowState(text, cs);
  cs.flows.push(flow);
  store.containers.set(el, cs);
  store.flows.set(text, flow);
  const desired = $flattenContainer(node);
  if (desired.length > 0) {
    $applyRegion(cs, flow, [], 0, desired, binding, new Set());
  }
  return el;
}

/** The flows of a container element, creating one if it has none. */
function flowsOf(el: XmlElement): XmlText[] {
  const flows = el.toArray().filter((c): c is XmlText => c instanceof XmlText);
  if (flows.length === 0) {
    const text = new XmlText();
    el.insert(el.length, [text]);
    flows.push(text);
  }
  return flows;
}

const isGroupNode = (n: LexicalNode | null): n is ElementNode =>
  n instanceof ElementNode && getGroupSpec(klassOf(n)) !== null;

/** A group, or an item of a group. */
const isGroupPart = (n: LexicalNode): boolean =>
  isGroupNode(n) || isGroupNode(n.getParent());

/**
 * A group, or an item that is a nesting level (it holds the nested group):
 * the nodes whose change can change the grouping. A line item's own change
 * (its text, its checked state) is written to its own unit.
 */
const $isStructuralGroupPart = (n: LexicalNode): boolean =>
  isGroupNode(n) ||
  (n instanceof ElementNode &&
    isGroupNode(n.getParent()) &&
    $getNestedGroup(n, n.getParent()!) !== null);

/** Whether a group (or an item of one) in `container`'s flow was written. */
function $hasChangedGroup(
  container: ElementNode,
  dirty: Set<NodeKey>,
): boolean {
  for (const key of dirty) {
    const node = $getNodeByKey(key);
    if (
      node === null ||
      node === container ||
      !$isStructuralGroupPart(node) ||
      !$isChanged(node)
    ) {
      continue;
    }
    for (let n: LexicalNode = node; ; ) {
      const parent = n.getParent();
      if (parent === null) {
        break;
      }
      if (parent.is(container)) {
        return true;
      }
      if (!isGroupPart(parent)) {
        break;
      }
      n = parent;
    }
  }
  return false;
}

/**
 * The cache of a container that has none yet (written for the first time by
 * this binding, or after a snapshot render): its flows are read, and their
 * units are given the keys of the container's units when the two agree in
 * count and kind. Otherwise the flows are rewritten whole.
 */
function $buildStateForWrite(
  el: XmlElement,
  node: ElementNode,
  binding: BindingV2,
): ContainerState {
  const store = getStore(binding);
  const cs: ContainerState = {byKey: new Map(), el, flows: []};
  const parsed: {flow: FlowState; unit: ParsedUnit}[] = [];
  for (const text of flowsOf(el)) {
    const flow = newFlowState(text, cs);
    cs.flows.push(flow);
    store.flows.set(text, flow);
    for (const unit of implicitLines(
      parseOps(
        readFlowRange(text, 0, text.length),
        binding,
        $isRootOrShadowRoot(node),
      ),
      node,
      false,
    )) {
      parsed.push({flow, unit});
    }
  }
  store.containers.set(el, cs);
  const desired = $flattenContainer(node);
  const agree =
    parsed.length === desired.length &&
    parsed.every(({unit}, i) => unit.kind === desired[i].kind);
  if (agree) {
    parsed.forEach(({flow, unit}, i) => {
      const d = desired[i];
      const u: Unit = {
        flow,
        groupItem: unit.groupItem,
        index: 0,
        key: d.key,
        keys: d.kind === 'tail' ? d.nodes.map(n => n.getKey()) : [d.key],
        kind: d.kind,
        len: unit.len,
        markerId: unit.markerId,
        ops: unit.ops,
        start: 0,
      };
      flow.units.push(u);
      indexUnit(cs, u);
    });
    for (const flow of cs.flows) {
      indexFlow(flow);
    }
  } else {
    // Fallback: the flows do not describe this node; rewrite them.
    for (const flow of cs.flows) {
      if (flow.text.length > 0) {
        flow.text.delete(0, flow.text.length);
      }
    }
  }
  return cs;
}

/**
 * @internal Lexical -> Yjs for the children of a container element in the
 * block-marker layout.
 */
export function $updateFlowContainer(
  _y: YDoc,
  el: XmlElement,
  node: ElementNode,
  binding: BindingV2,
  dirty: Set<NodeKey>,
): void {
  const store = getStore(binding);
  let cs = store.containers.get(el);
  let structural = false;
  if (
    cs === undefined ||
    cs.flows.length === 0 ||
    cs.flows.some(f => f.text.parent !== el)
  ) {
    cs = $buildStateForWrite(el, node, binding);
    structural = true;
  }
  structural = structural || $isChanged(node) || $hasChangedGroup(node, dirty);
  const embeds: Unit[] = [];
  if (structural) {
    $syncStructure(cs, $flattenContainer(node, cs), binding, dirty);
  } else {
    const touched = new Set<Unit>();
    for (const key of dirty) {
      const unit = cs.byKey.get(key);
      if (unit !== undefined && unit.kind !== 'embed') {
        touched.add(unit);
      }
    }
    for (const unit of touched) {
      const n = $getNodeByKey(unit.key);
      let desired: DesiredUnit | null = null;
      if (unit.kind === 'line' && n instanceof ElementNode) {
        desired = $lineUnitOf(n);
      } else if (unit.kind === 'tail' && n !== null) {
        const nodes: LexicalNode[] = [];
        for (
          let c: LexicalNode | null = n;
          c && $isInlineChild(c);
          c = c.getNextSibling()
        ) {
          nodes.push(c);
        }
        desired = {key: unit.key, kind: 'tail', nodes};
      }
      if (desired === null) {
        // The unit's node is no longer what the cache says: do the
        // structural pass instead.
        $syncStructure(cs, $flattenContainer(node, cs), binding, dirty);
        break;
      }
      const flow = unit.flow;
      startOf(flow, unit);
      $applyRegion(cs, flow, [unit], unit.index, [desired], binding, dirty);
    }
  }
  for (const key of dirty) {
    const unit = cs.byKey.get(key);
    if (unit !== undefined && unit.kind === 'embed') {
      embeds.push(unit);
    }
  }
  for (const unit of embeds) {
    const embedded = $getNodeByKey(unit.key);
    const embedEl = unit.ops.length > 0 ? unit.ops[0].insert : null;
    if (embedded !== null && embedEl instanceof XmlElement) {
      $updateYFragment(_y, embedEl, embedded, binding, dirty);
    }
  }
}

/** Keys of the inline descendants of a line (through inline elements). */
function collectInlineKeys(
  first: NodeKey | null,
  get: (key: NodeKey) => LexicalNode | undefined | null,
  out: NodeKey[],
): void {
  for (let key = first; key !== null; ) {
    const child = get(key);
    if (child == null) {
      return;
    }
    out.push(key);
    if (child instanceof ElementNode) {
      collectInlineKeys(child.__first, get, out);
    }
    key = child.__next;
  }
}

/** The leaf keys a unit held in the previous editor state. */
function unitPrevLeafKeys(unit: Unit): NodeKey[] {
  if (unit.kind === 'tail') {
    return unit.keys;
  }
  if (unit.kind === 'embed' || writeContext === null) {
    return [];
  }
  const {prev} = writeContext;
  const node = prev.get(unit.key);
  const out: NodeKey[] = [];
  if (node instanceof ElementNode) {
    collectInlineKeys(node.__first, key => prev.get(key), out);
  }
  return out;
}

/** The leaf keys a desired unit holds now. */
function $desiredLeafKeys(unit: DesiredUnit, out: Set<NodeKey>): void {
  if (unit.kind === 'tail') {
    for (const n of unit.nodes) {
      out.add(n.getKey());
    }
  } else if (unit.kind === 'line') {
    const keys: NodeKey[] = [];
    collectInlineKeys(
      unit.node.getLatest().__first,
      key => $getNodeByKey(key),
      keys,
    );
    for (const k of keys) {
      out.add(k);
    }
  }
}

/** The text a desired line or tail holds (format wrappers are transparent). */
function $desiredText(unit: DesiredUnit): string {
  if (unit.kind === 'tail') {
    return unit.nodes.map(n => n.getTextContent()).join('');
  }
  return unit.kind === 'line' ? unit.node.getTextContent() : '';
}

/** The characters a cached unit holds, without its marker. */
function unitText(unit: Unit): string {
  let text = '';
  for (const op of unit.ops) {
    if (typeof op.insert === 'string') {
      text += op.insert;
    }
  }
  return unit.kind === 'line' && markerOf(unit) !== null
    ? text.slice(0, -1)
    : text;
}

/**
 * Whether an old unit that lost its key was removed (its characters are
 * deleted exactly) rather than merged into a line of its segment (diffed by
 * characters, so a join keeps concurrent typing in the joined text). It was
 * removed when the segment has no lines at all, when it is an embed or held
 * no content, or when none of its leaves and not its last character (what a
 * join, or a delete that ends inside it, leaves of it) appear in the segment
 * any more. Lexical merges adjacent text nodes, so a joined line's
 * leaves do not always survive by key.
 */
function $isRemovedUnit(
  unit: Unit,
  segmentSize: number,
  leaves: Set<NodeKey>,
  segmentText: string,
): boolean {
  if (segmentSize === 0 || unit.kind === 'embed') {
    return true;
  }
  const own = unitPrevLeafKeys(unit);
  const text = unitText(unit);
  if (own.length === 0 || text.length === 0) {
    return true;
  }
  if (own.some(key => leaves.has(key))) {
    return false;
  }
  // A delete that ends inside it leaves a suffix of it in the merged line.
  return !segmentText.includes(text[text.length - 1]);
}

/**
 * Whether the inline content of a line is the same nodes as in the previous
 * editor state (pointer comparisons, no text is read).
 */
function $sameInlineContent(key: NodeKey): boolean {
  if (writeContext === null) {
    return false;
  }
  const {prev} = writeContext;
  const before = prev.get(key);
  const now = $getNodeByKey(key);
  if (!(before instanceof ElementNode) || !(now instanceof ElementNode)) {
    return false;
  }
  const same = (a: NodeKey | null, b: NodeKey | null): boolean => {
    while (a !== null || b !== null) {
      if (a !== b || a === null) {
        return false;
      }
      const p = prev.get(a);
      const n = $getNodeByKey(a);
      if (p === undefined || n === null || p !== n.getLatest()) {
        return false;
      }
      // An inline element is not cloned when only its children change.
      if (p instanceof ElementNode && !same(p.__first, p.__first)) {
        return false;
      }
      a = p.__next;
      b = n.getLatest().__next;
    }
    return true;
  };
  return same(before.__first, now.getLatest().__first);
}

/**
 * What a unit matched by key needs: nothing (`'stable'`), only new marker
 * attributes (`'marker'`, with the changes), or a rewrite (`'changed'`).
 */
function $anchorState(
  o: Unit,
  d: DesiredUnit,
  binding: BindingV2,
  dirty: Set<NodeKey>,
): 'stable' | 'changed' | Attrs {
  if (d.kind === 'embed') {
    // Its own content is synced through its element.
    return 'stable';
  }
  if (d.kind === 'tail') {
    return d.nodes.length === o.keys.length &&
      d.nodes.every((n, i) => n.getKey() === o.keys[i] && !dirty.has(o.keys[i]))
      ? 'stable'
      : 'changed';
  }
  const contentSame = !dirty.has(d.key) || $sameInlineContent(d.key);
  if (!contentSame) {
    return 'changed';
  }
  if (
    dirty.has(d.key) ||
    d.groupChanged ||
    o.groupItem !== (d.group !== null)
  ) {
    const current = markerOf(o);
    if (current === null) {
      return 'changed';
    }
    const changes = attributeChanges(
      'marker',
      current,
      $markerAttributes(d.node, d.group, d.level),
      binding,
    );
    return changes === null ? 'stable' : changes;
  }
  return 'stable';
}

/** Indexes (into `values`) of a longest strictly increasing subsequence. */
function longestIncreasing(values: number[]): number[] {
  const tails: number[] = [];
  const prev: number[] = new Array(values.length).fill(-1);
  for (let i = 0; i < values.length; i++) {
    let lo = 0;
    let hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (values[tails[mid]] < values[i]) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    if (lo > 0) {
      prev[i] = tails[lo - 1];
    }
    tails[lo] = i;
  }
  const result: number[] = [];
  for (
    let i = tails.length > 0 ? tails[tails.length - 1] : -1;
    i !== -1;
    i = prev[i]
  ) {
    result.push(i);
  }
  return result.reverse();
}

/**
 * The structural pass, anchored on unit identity rather than on characters:
 *
 * 1. Units are matched by node key, keeping the longest run in order
 *    (anchors). An anchor whose content and marker did not change is stable.
 * 2. Between anchors are gaps: old units that lost their key and new units.
 *    Each gap is rewritten together with the changed anchors next to it
 *    (a split is a changed anchor and a new unit, a join a changed anchor and
 *    an old unit whose leaves moved into it, a type change an old unit and a
 *    new one with the same leaves). A changed anchor with no gap next to it
 *    is rewritten on its own. Stable anchors are never part of a rewrite, so
 *    no diff runs across them.
 * 3. In each such segment, old units whose leaves are not in the segment any
 *    more (removed lines, moved blocks, removed embeds) are deleted exactly,
 *    by their own range: their characters and marker, never a neighbour's.
 *    What remains is diffed by characters, so a split inserts a marker into
 *    the line it splits and a join deletes one, and concurrent typing in the
 *    characters involved is kept.
 *
 * Segments are processed left to right and their format operations are
 * applied as one delta at the end.
 */
function $syncStructure(
  cs: ContainerState,
  desired: DesiredUnit[],
  binding: BindingV2,
  dirty: Set<NodeKey>,
): void {
  if (cs.flows.length !== 1) {
    $syncStructureMultiFlow(cs, desired, binding, dirty);
    return;
  }
  const flow = cs.flows[0];
  const old = flow.units.slice();
  const oldIndex = new Map<NodeKey, number>();
  old.forEach((u, i) => oldIndex.set(u.key, i));
  const pairD: number[] = [];
  const pairO: number[] = [];
  desired.forEach((d, di) => {
    const oi = oldIndex.get(d.key);
    if (oi !== undefined && old[oi].kind === d.kind) {
      pairD.push(di);
      pairO.push(oi);
    }
  });
  const anchors = longestIncreasing(pairO).map(k => ({
    di: pairD[k],
    oi: pairO[k],
  }));

  type Piece =
    | {
        anchor: true;
        o: Unit;
        d: DesiredUnit;
        stable: boolean;
        marker: Attrs | null;
      }
    | {anchor: false; olds: Unit[]; ds: DesiredUnit[]};
  const pieces: Piece[] = [];
  let po = -1;
  let pd = -1;
  for (const {oi, di} of [...anchors, {di: desired.length, oi: old.length}]) {
    if (oi > po + 1 || di > pd + 1) {
      pieces.push({
        anchor: false,
        ds: desired.slice(pd + 1, di),
        olds: old.slice(po + 1, oi),
      });
    }
    if (oi < old.length) {
      const o = old[oi];
      const d = desired[di];
      const state = $anchorState(o, d, binding, dirty);
      pieces.push({
        anchor: true,
        d,
        marker: typeof state === 'object' ? state : null,
        o,
        // Only new marker attributes: a format of the marker, not a rewrite.
        stable: state !== 'changed',
      });
    }
    po = oi;
    pd = di;
  }

  // Segments: maximal runs of gaps and of changed anchors next to a gap; a
  // changed anchor with no gap next to it is a segment of its own.
  type Segment = {olds: Unit[]; anchoredOlds: Set<Unit>; ds: DesiredUnit[]};
  type Kept = {unit: Unit; marker: Attrs | null};
  const segments: (Segment | Kept)[] = [];
  let current: Segment | null = null;
  pieces.forEach((piece, i) => {
    const isGap = (p: Piece | undefined) => p !== undefined && !p.anchor;
    if (piece.anchor && piece.stable) {
      current = null;
      segments.push({marker: piece.marker, unit: piece.o});
      return;
    }
    const attached =
      !piece.anchor || isGap(pieces[i - 1]) || isGap(pieces[i + 1]);
    if (current === null || !attached) {
      current = {anchoredOlds: new Set(), ds: [], olds: []};
      segments.push(current);
    }
    if (piece.anchor) {
      current.olds.push(piece.o);
      current.anchoredOlds.add(piece.o);
      current.ds.push(piece.d);
    } else {
      current.olds.push(...piece.olds);
      current.ds.push(...piece.ds);
    }
    if (!attached) {
      current = null;
    }
  });

  const formats: FormatOp[] = [];
  const desiredByKey = new Map<NodeKey, DesiredUnit>();
  for (const d of desired) {
    desiredByKey.set(d.key, d);
  }
  let lastUnit: Unit | null = null;
  const indexAfter = (unit: Unit | null): number => {
    if (unit === null) {
      return 0;
    }
    startOf(flow, unit);
    return unit.index + 1;
  };
  for (const segment of segments) {
    if (!('ds' in segment)) {
      const {unit, marker} = segment;
      if (marker !== null) {
        const last = unit.ops[unit.ops.length - 1];
        formats.push({
          attrs: marker,
          len: 1,
          pos: startOf(flow, unit) + unit.len - 1,
        });
        const attributes: Attrs = {...last.attributes};
        for (const key in marker) {
          if (marker[key] === null) {
            delete attributes[key];
          } else {
            attributes[key] = marker[key];
          }
        }
        unit.ops = [
          ...unit.ops.slice(0, -1),
          {attributes, insert: last.insert},
        ];
        const d = desiredByKey.get(unit.key);
        unit.groupItem =
          d !== undefined && d.kind === 'line' && d.group !== null;
      }
      lastUnit = unit;
      continue;
    }
    const leaves = new Set<NodeKey>();
    let segmentText = '';
    for (const d of segment.ds) {
      $desiredLeafKeys(d, leaves);
      if (d.kind !== 'embed') {
        segmentText += $desiredText(d);
      }
    }
    const remaining: Unit[] = [];
    for (const u of segment.olds) {
      const removed =
        !segment.anchoredOlds.has(u) &&
        $isRemovedUnit(u, segment.ds.length, leaves, segmentText);
      if (removed) {
        // Exactly this unit's characters and marker (or embed).
        const start = startOf(flow, u);
        for (const op of u.ops) {
          if (op.insert instanceof XmlElement) {
            binding.mapping.delete(op.insert);
          }
        }
        flow.text.delete(start, u.len);
        spliceUnits(flow, u.index, 1, []);
      } else {
        remaining.push(u);
      }
    }
    let at: number;
    if (remaining.length > 0) {
      startOf(flow, remaining[0]);
      at = remaining[0].index;
    } else {
      at = indexAfter(lastUnit);
    }
    if (remaining.length > 0 || segment.ds.length > 0) {
      const units = $applyRegion(
        cs,
        flow,
        remaining,
        at,
        segment.ds,
        binding,
        dirty,
        formats,
      );
      if (units.length > 0) {
        lastUnit = units[units.length - 1];
      } else if (at > 0) {
        lastUnit = flow.units[at - 1];
      } else {
        lastUnit = null;
      }
    }
  }
  applyFormats(flow.text, formats);
}

/**
 * The structural pass for a container with more than one flow (two clients
 * created its flow concurrently): units in the other flows are deleted and
 * everything is written into the first.
 */
function $syncStructureMultiFlow(
  cs: ContainerState,
  desired: DesiredUnit[],
  binding: BindingV2,
  dirty: Set<NodeKey>,
): void {
  const [first, ...others] = cs.flows;
  for (const flow of others) {
    for (const u of flow.units.slice()) {
      for (const op of u.ops) {
        if (op.insert instanceof XmlElement) {
          binding.mapping.delete(op.insert);
        }
      }
      const start = startOf(flow, u);
      flow.text.delete(start, u.len);
      spliceUnits(flow, u.index, 1, []);
    }
  }
  cs.flows = [first];
  $syncStructure(cs, desired, binding, dirty);
}

// ---------------------------------------------------------------------------
// Reading

type RangeOp = Op & {id?: string};

/**
 * The content of `text` in [from, to) as delta ops, with the Yjs id of each
 * marker character. One walk over the flow's items: no delta of the whole
 * flow is built.
 */
function readFlowRange(text: XmlText, from: number, to: number): RangeOp[] {
  return readFlowItems(text._start, 0, {}, from, to, null).ops;
}

/**
 * Reads delta ops from the item `start` (skipping its first `startOffset`
 * characters) with the formatting `startAttrs` in effect there, from the
 * countable position `from` to `to` (relative to the start), or, with
 * `stop`, up to and including the first live item for which `stop` returns
 * true.
 */
function readFlowItems(
  start: YItem | null,
  startOffset: number,
  startAttrs: Attrs,
  from: number,
  to: number,
  stop: ((id: string) => boolean) | null,
): {ops: RangeOp[]; stopped: boolean} {
  const ops: RangeOp[] = [];
  let attrs: Attrs = startAttrs;
  let pos = -startOffset;
  let stopped = false;
  const pushText = (str: string) => {
    const last = ops[ops.length - 1];
    if (
      last !== undefined &&
      typeof last.insert === 'string' &&
      last.attributes === attrs &&
      last.id === undefined
    ) {
      last.insert += str;
    } else {
      ops.push({attributes: attrs, insert: str});
    }
  };
  for (let n = start; n !== null && pos < to && !stopped; n = n.right) {
    if (n.deleted) {
      continue;
    }
    const content = n.content;
    if (content instanceof ContentFormat) {
      if (n === start && startOffset > 0) {
        continue;
      }
      attrs = {...attrs};
      if (content.value === null) {
        delete attrs[content.key];
      } else {
        attrs[content.key] = content.value;
      }
      continue;
    }
    if (!n.countable) {
      continue;
    }
    const len = n.length;
    if (pos + len > from) {
      const s0 = Math.max(0, from - pos);
      const e0 = Math.min(len, to - pos);
      if (content instanceof ContentString) {
        const str = content.str;
        let runStart = s0;
        for (let i = s0; i < e0; i++) {
          if (str[i] === MARKER_CHAR) {
            if (i > runStart) {
              pushText(str.slice(runStart, i));
            }
            const id = `${n.id.client}:${n.id.clock + i}`;
            ops.push({attributes: attrs, id, insert: MARKER_CHAR});
            runStart = i + 1;
            if (stop !== null && stop(id)) {
              stopped = true;
              break;
            }
          }
        }
        if (e0 > runStart && !stopped) {
          pushText(str.slice(runStart, e0));
        }
      } else if (content instanceof ContentType) {
        ops.push({attributes: attrs, insert: content.type as XmlElement});
        if (stop !== null && stop(idString(n.id))) {
          stopped = true;
        }
      } else {
        ops.push({
          attributes: attrs,
          insert: content instanceof ContentEmbed ? content.embed : {},
        });
      }
    }
    pos += len;
  }
  return {ops, stopped};
}

type ParsedUnit = {
  kind: 'line' | 'embed' | 'tail';
  ops: Op[];
  content: Op[];
  len: number;
  markerId: string | null;
  marker: Attrs | null;
  groupItem: boolean;
  el: XmlElement | null;
};

/**
 * Whether a marker makes its line an item of a group: it names a group whose
 * items include the line's type. Keys merged from different clients can name
 * a group on a line that is no longer an item (a peer turned the item into a
 * paragraph while another changed the list); such keys are ignored.
 */
function isGroupItemMarker(marker: Attrs, binding: BindingV2): boolean {
  const spec = groupSpecOfType(marker[BG], binding);
  if (spec === null || typeof marker[BT] !== 'string') {
    return false;
  }
  const info = binding.editor._nodes.get(marker[BT]);
  return (
    info !== undefined &&
    spec.items.some(k => info.klass === k || info.klass.prototype instanceof k)
  );
}

const itemGroupTypes = new WeakMap<BindingV2, Map<string, string | null>>();

/** The type of the first registered group whose items include `type`. */
function groupTypeOfItem(type: string, binding: BindingV2): string | null {
  let cache = itemGroupTypes.get(binding);
  if (cache === undefined) {
    cache = new Map();
    itemGroupTypes.set(binding, cache);
  }
  let result = cache.get(type);
  if (result === undefined) {
    result = null;
    const info = binding.editor._nodes.get(type);
    if (info !== undefined) {
      for (const [groupType, {klass}] of binding.editor._nodes) {
        const spec = getGroupSpec(klass);
        if (
          spec !== null &&
          spec.items.some(
            k => info.klass === k || info.klass.prototype instanceof k,
          )
        ) {
          result = groupType;
          break;
        }
      }
    }
    cache.set(type, result);
  }
  return result;
}

/**
 * The marker as read: a line whose type is a group item but whose marker
 * names no valid group (keys merged from different clients: one turned a
 * paragraph into an item while another dropped the group keys) is an item of
 * the item's group with default key fields, as Lexical would wrap it.
 */
function normalizeMarker(marker: Attrs, binding: BindingV2): Attrs {
  if (typeof marker[BT] !== 'string' || isGroupItemMarker(marker, binding)) {
    return marker;
  }
  const groupType = groupTypeOfItem(marker[BT], binding);
  const result: Attrs = {};
  for (const k in marker) {
    if (k !== BG && !k.startsWith(GROUP_FIELD_PREFIX)) {
      result[k] = marker[k];
    }
  }
  if (groupType !== null) {
    result[BG] = groupType;
  } else {
    delete result[BL];
  }
  return result;
}

/**
 * Splits flow content into units. Every U+2029 with a marker type ends a
 * line. One without a type (formatting lost to a concurrent change) ends a
 * paragraph when the container holds lines (`lineContainer`, or a typed
 * marker in `ops`), so U+2029 never shows up as text there; in a container of
 * inline content (a code block) it is text.
 */
function parseOps(
  rawOps: RangeOp[],
  binding: BindingV2,
  lineContainer: boolean,
): ParsedUnit[] {
  // Content from a snapshot delta can hold several U+2029 in one string.
  const ops: RangeOp[] = [];
  for (const op of rawOps) {
    if (
      typeof op.insert === 'string' &&
      op.insert.length > 1 &&
      op.insert.includes(MARKER_CHAR)
    ) {
      for (const part of op.insert.split(/(\u2029)/)) {
        if (part !== '') {
          ops.push({attributes: op.attributes, insert: part});
        }
      }
    } else {
      ops.push(op);
    }
  }
  const typelessIsMarker =
    lineContainer ||
    ops.some(
      op => op.insert === MARKER_CHAR && typeof op.attributes[BT] === 'string',
    );
  const units: ParsedUnit[] = [];
  let pending: Op[] = [];
  let pendingLen = 0;
  const flushTail = () => {
    if (pending.length > 0) {
      units.push({
        content: pending,
        el: null,
        groupItem: false,
        kind: 'tail',
        len: pendingLen,
        marker: null,
        markerId: null,
        ops: pending,
      });
      pending = [];
      pendingLen = 0;
    }
  };
  for (const op of ops) {
    if (
      op.insert === MARKER_CHAR &&
      (typeof op.attributes[BT] === 'string' || typelessIsMarker)
    ) {
      const markerOp: Op = {attributes: op.attributes, insert: MARKER_CHAR};
      const marker = normalizeMarker(
        typeof op.attributes[BT] === 'string'
          ? op.attributes
          : {...op.attributes, [BT]: ParagraphNode.getType()},
        binding,
      );
      units.push({
        content: pending,
        el: null,
        groupItem: isGroupItemMarker(marker, binding),
        kind: 'line',
        len: pendingLen + 1,
        marker,
        markerId: op.id === undefined ? null : op.id,
        ops: [...pending, markerOp],
      });
      pending = [];
      pendingLen = 0;
    } else if (op.insert instanceof XmlElement && op.attributes[BE] === true) {
      flushTail();
      units.push({
        content: [],
        el: op.insert,
        groupItem: false,
        kind: 'embed',
        len: 1,
        marker: null,
        markerId: null,
        ops: [{attributes: op.attributes, insert: op.insert}],
      });
    } else {
      pending.push({attributes: op.attributes, insert: op.insert});
      pendingLen += opLength(op);
    }
  }
  flushTail();
  return units;
}

/**
 * Inline content that no marker ends, in a container that holds lines (the
 * root, a shadow root, or a flow with other lines), is read as a paragraph:
 * typing into a line that a peer deleted concurrently leaves such content. The
 * next local edit of that paragraph writes its marker.
 */
function implicitLines(
  parsed: ParsedUnit[],
  container: ElementNode,
  hasOtherBlocks: boolean,
): ParsedUnit[] {
  if (
    !parsed.some(p => p.kind === 'tail') ||
    !(
      $isRootOrShadowRoot(container) ||
      hasOtherBlocks ||
      parsed.some(p => p.kind === 'line')
    )
  ) {
    return parsed;
  }
  return parsed.map(p =>
    p.kind === 'tail'
      ? {...p, kind: 'line', marker: {[BT]: ParagraphNode.getType()}}
      : p,
  );
}

/** The text and line-break leaves of an element, through format wrappers. */
function $runLeaves(node: ElementNode): RunNode[] {
  const leaves: RunNode[] = [];
  const visit = (parent: ElementNode) => {
    for (let c = parent.getFirstChild(); c !== null; c = c.getNextSibling()) {
      if ($isTextNode(c) || $isLineBreakNode(c)) {
        leaves.push(c);
      } else if ($isFormatWrapper(c)) {
        visit(c);
      }
    }
  };
  visit(node);
  return leaves;
}

/** Reads inline content into `block`, reusing `prevLeaves` when they align. */
function $readInline(
  block: ElementNode,
  content: Op[],
  prevLeaves: RunNode[],
  binding: BindingV2,
): void {
  const segments: (
    | {insert: string; attributes: TextAttributes}[]
    | XmlElement
  )[] = [];
  let current: {insert: string; attributes: TextAttributes}[] | null = null;
  for (const op of content) {
    if (typeof op.insert === 'string') {
      if (current === null) {
        current = [];
        segments.push(current);
      }
      current.push({
        attributes: op.attributes as TextAttributes,
        insert: op.insert,
      });
    } else {
      current = null;
      if (op.insert instanceof XmlElement) {
        segments.push(op.insert);
      }
    }
  }
  const processed = segments.map(seg =>
    seg instanceof XmlElement
      ? seg
      : $mergeIndexOnlyDeltas($splitLineBreakDeltas(seg, binding), binding),
  );
  const all: {insert: string; attributes: TextAttributes}[] = [];
  for (const seg of processed) {
    if (!(seg instanceof XmlElement)) {
      all.push(...seg);
    }
  }
  const nodes = $syncRunNodesFromDeltas(all, prevLeaves, binding);
  const items: InlineItem[] = [];
  let hasWrappers = false;
  let index = 0;
  for (const seg of processed) {
    if (seg instanceof XmlElement) {
      const n = $createOrUpdateNodeFromYElement(seg, binding, new Set(), false);
      if (n !== null) {
        const wrappers = $parseWrapperDescriptors(
          seg.getAttribute(WRAPPERS_ATTR_KEY) as unknown,
          binding,
        );
        hasWrappers = hasWrappers || wrappers.length > 0;
        items.push({node: n, wrappers});
      }
    } else {
      for (const d of seg) {
        const wrappers = $parseWrapperDescriptors(d.attributes, binding);
        hasWrappers = hasWrappers || wrappers.length > 0;
        items.push({node: nodes[index++], wrappers});
      }
    }
  }
  if (hasWrappers || block.getChildren().some($isFormatWrapper)) {
    $rebuildInlineChildren(block, items, binding);
  } else {
    $setChildren(
      block,
      items.map(item => item.node),
    );
  }
}

/** The declared field and state keys of a line's marker. */
function $lineFieldAttrs(
  node: ElementNode,
  derived: ReadonlySet<string>,
): Attrs {
  const all = $markerAttributes(node, null, 0);
  const result: Attrs = {};
  for (const k in all) {
    if (
      k.startsWith(FIELD_PREFIX) &&
      !derived.has(fieldName(k.slice(FIELD_PREFIX.length)))
    ) {
      result[k] = all[k];
    }
  }
  return result;
}

function $applyMarker(
  node: ElementNode,
  marker: Attrs,
  binding: BindingV2,
): void {
  const spec = getLineSpec(klassOf(node));
  if (spec === null) {
    return;
  }
  const gspec = groupSpecOfType(marker[BG], binding);
  const derived = gspec === null ? EMPTY_SET : gspec.derived;
  const incoming: Attrs = {};
  for (const k in marker) {
    if (k.startsWith(FIELD_PREFIX)) {
      const f = fieldName(k.slice(FIELD_PREFIX.length));
      if (
        f.startsWith(STATE_KEY_PREFIX) ||
        (spec.fields.has(f) && !derived.has(f))
      ) {
        incoming[k] = marker[k];
      }
    }
  }
  if (equalAttrValues(incoming, $lineFieldAttrs(node, derived))) {
    return;
  }
  const json = $exportSchemaJSON(node.getLatest());
  for (const f of spec.fields) {
    if (!derived.has(f)) {
      delete json[f];
    }
  }
  const state: Attrs = {};
  for (const k in incoming) {
    const decoded = decodeWrapperField(
      k.slice(FIELD_PREFIX.length),
      incoming[k],
    );
    if (decoded === null || isUnsafeKey(decoded.name)) {
      continue;
    }
    if (decoded.name.startsWith(STATE_KEY_PREFIX)) {
      state[attrKeyToStateKey(decoded.name)] = decoded.value;
    } else {
      json[decoded.name] = decoded.value;
    }
  }
  json.type = node.getType();
  const writable = node.updateFromJSON(
    json as Parameters<ElementNode['updateFromJSON']>[0],
  );
  $getWritableNodeState(writable).updateFromJSON(state);
}

type Reuse = {
  byMarker: Map<string, NodeKey>;
  /** The old unit of each claimed marker id, to skip unchanged content. */
  units: Map<string, Unit>;
  /** Old lines that no parsed marker id claims, in order. */
  leftovers: NodeKey[];
  claimed: Set<NodeKey>;
};

function makeReuse(oldUnits: readonly Unit[], parsed: ParsedUnit[]): Reuse {
  const ids = new Set<string>();
  for (const p of parsed) {
    if (p.markerId !== null) {
      ids.add(p.markerId);
    }
  }
  const byMarker = new Map<string, NodeKey>();
  const units = new Map<string, Unit>();
  const leftovers: NodeKey[] = [];
  for (const u of oldUnits) {
    if (u.kind !== 'line') {
      continue;
    }
    if (u.markerId !== null && ids.has(u.markerId)) {
      byMarker.set(u.markerId, u.key);
      units.set(u.markerId, u);
    } else {
      leftovers.push(u.key);
    }
  }
  return {byMarker, claimed: new Set(), leftovers, units};
}

function $materializeLine(
  p: ParsedUnit,
  reuse: Reuse,
  binding: BindingV2,
): ElementNode {
  const marker = p.marker!;
  const type = marker[BT] as string;
  const info = binding.editor._nodes.get(type);
  if (info === undefined) {
    throw new Error(`$readFlowContainer: Node ${type} is not registered`);
  }
  let candidate: LexicalNode | null = null;
  const byId = p.markerId === null ? undefined : reuse.byMarker.get(p.markerId);
  if (byId !== undefined && !reuse.claimed.has(byId)) {
    candidate = $getNodeByKey(byId);
  }
  while (candidate === null && reuse.leftovers.length > 0) {
    const key = reuse.leftovers.shift()!;
    if (!reuse.claimed.has(key)) {
      candidate = $getNodeByKey(key);
    }
  }
  let node: ElementNode;
  let prevLeaves: RunNode[] = [];
  if (
    candidate instanceof ElementNode &&
    candidate.getType() === type &&
    // An item is only reused where its group's fields can be read.
    (groupTypeOfItem(type, binding) === null ||
      !candidate.isAttached() ||
      isGroupNode(candidate.getParent()))
  ) {
    node = candidate;
    prevLeaves = $runLeaves(candidate);
  } else {
    const created = new info.klass();
    invariant(
      created instanceof ElementNode,
      '$readFlowContainer: line %s must be an ElementNode',
      type,
    );
    node = created;
    if (candidate instanceof ElementNode) {
      // A type change: the text nodes move to the new line, which the caller
      // puts where the old one was.
      prevLeaves = $runLeaves(candidate);
    }
  }
  reuse.claimed.add(node.getKey());
  // A line whose marker and content are what the cache holds for it is left
  // alone: a change elsewhere in its group does not rewrite every line.
  const previous =
    p.markerId === null ? undefined : reuse.units.get(p.markerId);
  const unchanged =
    previous !== undefined &&
    node === candidate &&
    previous.key === node.getKey() &&
    equalOps(previous.ops, p.ops);
  if (!unchanged) {
    $applyMarker(node, marker, binding);
    $readInline(node.getLatest(), p.content, prevLeaves, binding);
  }
  return node.getLatest();
}

function equalOps(a: readonly Op[], b: readonly Op[]): boolean {
  return (
    a.length === b.length &&
    a.every(
      (op, i) =>
        op.insert === b[i].insert &&
        (op.attributes === b[i].attributes ||
          equalAttrValues(op.attributes, b[i].attributes)),
    )
  );
}

// Groups ----------------------------------------------------------------

type GroupFrame = {
  readonly type: string;
  readonly keyAttrs: Attrs;
  readonly keyStr: string;
  readonly children: (ElementNode | WrapperFrame)[];
};
type WrapperFrame = {readonly group: GroupFrame};
type GroupItem = {
  node: ElementNode;
  type: string;
  keyAttrs: Attrs;
  level: number;
};

function groupItemOf(node: ElementNode, marker: Attrs): GroupItem {
  const keyAttrs: Attrs = {};
  for (const k in marker) {
    if (k.startsWith(GROUP_FIELD_PREFIX)) {
      keyAttrs[k] = marker[k];
    }
  }
  const level = marker[BL];
  return {
    keyAttrs,
    level:
      typeof level === 'number' && level > 0 && Number.isInteger(level)
        ? Math.min(level, 128)
        : 0,
    node,
    type: marker[BG] as string,
  };
}

/** The canonical group tree of consecutive items (a function of the markers). */
function buildGroupFrames(items: GroupItem[]): GroupFrame[] {
  const roots: GroupFrame[] = [];
  const stack: GroupFrame[] = [];
  for (const item of items) {
    const level = item.level;
    const keyStr = item.type + '\u0000' + stableStringify(item.keyAttrs);
    if (stack.length > level + 1) {
      stack.length = level + 1;
    }
    if (stack.length === level + 1 && stack[level].keyStr !== keyStr) {
      stack.length = level;
    }
    while (stack.length < level + 1) {
      const frame: GroupFrame = {
        children: [],
        keyAttrs: item.keyAttrs,
        keyStr,
        type: item.type,
      };
      if (stack.length === 0) {
        roots.push(frame);
      } else {
        stack[stack.length - 1].children.push({group: frame});
      }
      stack.push(frame);
    }
    stack[level].children.push(item.node);
  }
  return roots;
}

function $groupKeyAttrs(group: ElementNode): Attrs {
  const spec = getGroupSpec(klassOf(group));
  const attrs: Attrs = {};
  if (spec !== null) {
    const json = $exportSchemaJSON(group.getLatest());
    for (const field of spec.key) {
      putField(attrs, GROUP_FIELD_PREFIX, field, json[field]);
    }
  }
  return attrs;
}

function $applyGroupKey(group: ElementNode, keyAttrs: Attrs): void {
  const spec = getGroupSpec(klassOf(group));
  if (spec === null || equalAttrValues($groupKeyAttrs(group), keyAttrs)) {
    return;
  }
  const json = $exportSchemaJSON(group.getLatest());
  for (const field of spec.key) {
    delete json[field];
  }
  for (const k in keyAttrs) {
    const decoded = decodeWrapperField(
      k.slice(GROUP_FIELD_PREFIX.length),
      keyAttrs[k],
    );
    if (decoded !== null && !isUnsafeKey(decoded.name)) {
      json[decoded.name] = decoded.value;
    }
  }
  json.type = group.getType();
  group.updateFromJSON(json as Parameters<ElementNode['updateFromJSON']>[0]);
}

function $materializeGroups(
  frames: GroupFrame[],
  claimed: Set<NodeKey>,
  binding: BindingV2,
  all: ElementNode[] = [],
  // Children of the container itself, when it is a group (see below).
  own: (ElementNode | WrapperFrame)[] = [],
  ownOut: LexicalNode[] = [],
): ElementNode[] {
  const $group = (frame: GroupFrame): ElementNode => {
    const children = frame.children.map(c =>
      c instanceof ElementNode ? c : $wrapper(c),
    );
    let node: ElementNode | null = null;
    for (const c of children) {
      const parent = c.getParent();
      if (
        isGroupNode(parent) &&
        parent.getType() === frame.type &&
        !claimed.has(parent.getKey())
      ) {
        node = parent;
        break;
      }
    }
    if (node === null) {
      const info = binding.editor._nodes.get(frame.type);
      if (info === undefined) {
        throw new Error(
          `$readFlowContainer: Node ${frame.type} is not registered`,
        );
      }
      const created = new info.klass();
      invariant(
        created instanceof ElementNode,
        '$readFlowContainer: group %s must be an ElementNode',
        frame.type,
      );
      node = created;
    }
    claimed.add(node.getKey());
    $applyGroupKey(node, frame.keyAttrs);
    $setChildren(node.getLatest(), children);
    all.push(node);
    return node.getLatest();
  };
  const $wrapper = (frame: WrapperFrame): ElementNode => {
    const nested = $group(frame.group);
    const parent = nested.getParent();
    let wrapper: ElementNode;
    if (
      parent !== null &&
      !claimed.has(parent.getKey()) &&
      $getNestedGroup(parent, nested) === nested
    ) {
      wrapper = parent;
    } else {
      const spec = getGroupSpec(klassOf(nested))!;
      const created = new spec.items[0]();
      invariant(
        created instanceof ElementNode,
        '$readFlowContainer: group item must be an ElementNode',
      );
      wrapper = created;
    }
    claimed.add(wrapper.getKey());
    $setChildren(wrapper, [nested]);
    return wrapper.getLatest();
  };
  for (const c of own) {
    ownOut.push(c instanceof ElementNode ? c : $wrapper(c));
  }
  return frames.map($group);
}

/**
 * Builds the nodes of parsed units: the container's new top-level children
 * in order, and the node keys of each unit.
 */
function $materializeUnits(
  // Parsed units, or cached group items that did not change and are only
  // regrouped with the parsed ones.
  parsed: (ParsedUnit | Unit)[],
  reuse: Reuse,
  binding: BindingV2,
  container: ElementNode,
): {top: LexicalNode[]; keys: NodeKey[][]; groups: ElementNode[]} {
  const top: LexicalNode[] = [];
  const keys: NodeKey[][] = [];
  const groups: ElementNode[] = [];
  let items: GroupItem[] = [];
  const flushGroups = () => {
    if (items.length > 0) {
      let frames = buildGroupFrames(items);
      if (isGroupNode(container)) {
        // A group stored as a node (it broke its declaration): its own items
        // are its children, not a group inside it.
        const own: (ElementNode | WrapperFrame)[] = [];
        const rest: GroupFrame[] = [];
        for (const frame of frames) {
          if (frame.type === container.getType()) {
            own.push(...frame.children);
          } else {
            rest.push(frame);
          }
        }
        if (own.length > 0) {
          const ownOut: LexicalNode[] = [];
          $materializeGroups([], reuse.claimed, binding, groups, own, ownOut);
          top.push(...ownOut);
        }
        frames = rest;
      }
      const built = $materializeGroups(frames, reuse.claimed, binding, groups);
      top.push(...built);
      items = [];
    }
  };
  for (const p of parsed) {
    if ('flow' in p) {
      const node = $getNodeByKey(p.key);
      const marker = markerOf(p);
      invariant(
        node instanceof ElementNode && marker !== null,
        '$readFlowContainer: a cached group item is missing',
      );
      reuse.claimed.add(node.getKey());
      keys.push(p.keys);
      items.push(groupItemOf(node, normalizeMarker(marker, binding)));
    } else if (p.kind === 'line') {
      const node = $materializeLine(p, reuse, binding);
      keys.push([node.getKey()]);
      if (p.groupItem) {
        items.push(groupItemOf(node, p.marker!));
      } else {
        flushGroups();
        top.push(node);
      }
    } else if (p.kind === 'embed') {
      flushGroups();
      const node = $createOrUpdateNodeFromYElement(
        p.el!,
        binding,
        new Set(),
        false,
      );
      if (node !== null) {
        top.push(node);
        keys.push([node.getKey()]);
      } else {
        keys.push([]);
      }
    } else {
      flushGroups();
      // Inline children of a container that also has blocks: their leaves,
      // without rebuilding format wrappers (see the prototype notes).
      const holder: LexicalNode[] = [];
      const nodes = $syncRunNodesFromDeltas(
        $splitLineBreakDeltas(
          p.content
            .filter(op => typeof op.insert === 'string')
            .map(op => ({
              attributes: op.attributes as TextAttributes,
              insert: op.insert as string,
            })),
          binding,
        ),
        [],
        binding,
      );
      holder.push(...nodes);
      top.push(...holder);
      keys.push(holder.map(n => n.getKey()));
    }
  }
  flushGroups();
  return {groups, keys, top};
}

function makeUnits(
  flow: FlowState,
  parsed: ParsedUnit[],
  keys: NodeKey[][],
): Unit[] {
  return parsed.map((p, i) => ({
    flow,
    groupItem: p.groupItem,
    index: 0,
    key: keys[i][0] ?? '',
    keys: keys[i],
    kind: p.kind,
    len: p.len,
    markerId: p.markerId,
    ops: p.ops,
    start: 0,
  }));
}

/** The container child a unit's node sits under (through groups). */
function $topOf(unit: Unit, container: ElementNode): LexicalNode | null {
  const key = unit.kind === 'tail' ? unit.keys[unit.keys.length - 1] : unit.key;
  let node = key === undefined ? null : $getNodeByKey(key);
  while (node !== null) {
    const parent: ElementNode | null = node.getParent();
    if (parent === null) {
      return null;
    }
    if (parent.is(container)) {
      return node;
    }
    node = parent;
  }
  return null;
}

/** Puts `nodes` right after `prev` in `container` and removes `old` leftovers. */
function $placeTop(
  container: ElementNode,
  prev: LexicalNode | null,
  nodes: LexicalNode[],
  old: LexicalNode[],
): void {
  let cursor = prev;
  for (const n of nodes) {
    const expected =
      cursor === null ? container.getFirstChild() : cursor.getNextSibling();
    if (expected === null || !expected.is(n)) {
      if (cursor !== null) {
        cursor.insertAfter(n);
      } else if (expected !== null) {
        expected.insertBefore(n);
      } else {
        container.append(n);
      }
    }
    cursor = n.getLatest();
  }
  const keep = new Set(nodes.map(n => n.getKey()));
  for (const o of old) {
    const latest = $getNodeByKey(o.getKey());
    if (
      latest !== null &&
      !keep.has(latest.getKey()) &&
      latest.isAttached() &&
      container.is(latest.getParent())
    ) {
      latest.remove(true);
    }
  }
}

/**
 * A remote read can remove the nodes the local selection points into (a
 * line whose type changed, a group rebuilt around it). Point it at the start
 * of `fallback` instead, so the update keeps a valid selection; the cursor
 * sync that follows restores the exact position from its relative position
 * when it has one.
 */
function $repairSelection(fallback: LexicalNode | null): void {
  const selection = $getSelection();
  if (!$isRangeSelection(selection) || fallback === null) {
    return;
  }
  const lost = [selection.anchor, selection.focus].some(point => {
    const node = $getNodeByKey(point.key);
    return node === null || !node.isAttached();
  });
  if (!lost || !fallback.isAttached()) {
    return;
  }
  let target: LexicalNode = fallback;
  while (target instanceof ElementNode && target.getFirstChild() !== null) {
    target = target.getFirstChild()!;
  }
  const type = $isTextNode(target) ? 'text' : 'element';
  if (type === 'element' && !(target instanceof ElementNode)) {
    target = target.getParent() || fallback;
  }
  selection.anchor.set(target.getKey(), 0, type);
  selection.focus.set(target.getKey(), 0, type);
}

function deltaOps(
  text: XmlText,
  snapshot?: Snapshot,
  prevSnapshot?: Snapshot,
  computeYChange?: Parameters<typeof toDelta>[3],
): RangeOp[] {
  return toDelta(text, snapshot, prevSnapshot, computeYChange).map(d => ({
    attributes: d.attributes as Attrs,
    insert: d.insert,
  }));
}

/**
 * @internal Yjs -> Lexical for all the children of a container element in
 * the block-marker layout (a full read).
 */
export function $readFlowContainer(
  el: XmlElement,
  node: ElementNode,
  binding: BindingV2,
  snapshot?: Snapshot,
  prevSnapshot?: Snapshot,
  computeYChange?: Parameters<typeof toDelta>[3],
): void {
  const store = getStore(binding);
  const previous = store.containers.get(el);
  const texts = el.toArray().filter((c): c is XmlText => c instanceof XmlText);
  const isSnapshot = snapshot !== undefined;
  const rawByFlow = texts.map(text =>
    parseOps(
      isSnapshot
        ? deltaOps(text, snapshot, prevSnapshot, computeYChange)
        : readFlowRange(text, 0, text.length),
      binding,
      $isRootOrShadowRoot(node),
    ),
  );
  const hasBlocks = rawByFlow.some(units => units.some(u => u.kind === 'line'));
  const parsedByFlow = rawByFlow.map(units =>
    implicitLines(units, node, hasBlocks),
  );
  const allParsed = parsedByFlow.flat();
  const oldUnits: Unit[] =
    previous === undefined ? [] : previous.flows.flatMap(f => f.units);
  const reuse = makeReuse(oldUnits, allParsed);
  const cs: ContainerState = {byKey: new Map(), el, flows: []};
  if (allParsed.length === 1 && allParsed[0].kind === 'tail') {
    // An element whose children are inline (a code block, an inline element).
    $readInline(node, allParsed[0].content, $runLeaves(node), binding);
    const keys = node.getChildren().map(c => c.getKey());
    texts.forEach((text, i) => {
      const flow = newFlowState(text, cs);
      cs.flows.push(flow);
      if (parsedByFlow[i].length > 0) {
        flow.units = makeUnits(flow, parsedByFlow[i], [keys]);
      }
    });
  } else {
    const {top, keys, groups} = $materializeUnits(
      allParsed,
      reuse,
      binding,
      node,
    );
    $setChildren(node.getLatest(), top);
    $repairSelection(top.length > 0 ? top[0] : node);
    for (const g of groups) {
      store.refresh.add(g.getKey());
    }
    let k = 0;
    texts.forEach((text, i) => {
      const flow = newFlowState(text, cs);
      cs.flows.push(flow);
      flow.units = makeUnits(
        flow,
        parsedByFlow[i],
        keys.slice(k, k + parsedByFlow[i].length),
      );
      k += parsedByFlow[i].length;
    });
  }
  if (isSnapshot) {
    store.containers.delete(el);
    for (const text of texts) {
      store.flows.delete(text);
    }
    return;
  }
  for (const flow of cs.flows) {
    store.flows.set(flow.text, flow);
    indexFlow(flow);
    for (const u of flow.units) {
      indexUnit(cs, u);
    }
  }
  store.containers.set(el, cs);
}

const groupSig = (marker: Attrs | null): string => {
  if (marker === null) {
    return '';
  }
  const g: Attrs = {};
  for (const k in marker) {
    if (k === BG || k === BL || k.startsWith(GROUP_FIELD_PREFIX)) {
      g[k] = marker[k];
    }
  }
  return stableStringify(g);
};

/** The marker attributes that end a unit (null: no marker ends it). */
const markerOf = (unit: Unit): Attrs | null => {
  const last = unit.ops.length > 0 ? unit.ops[unit.ops.length - 1] : null;
  return unit.kind === 'line' && last !== null && last.insert === MARKER_CHAR
    ? last.attributes
    : null;
};

const unitIndex = (flow: FlowState, unit: Unit): number => {
  startOf(flow, unit);
  return unit.index;
};

/** The unit an item belongs to (in the cache's view): the next known end. */
function unitAfter(flow: FlowState, item: YItem): Unit | null {
  for (let n: YItem | null = item; n !== null; n = n.right) {
    const content = n.content;
    if (content instanceof ContentString) {
      const str = content.str;
      for (
        let i = str.indexOf(MARKER_CHAR);
        i !== -1;
        i = str.indexOf(MARKER_CHAR, i + 1)
      ) {
        const unit = flow.byEnd.get(`${n.id.client}:${n.id.clock + i}`);
        if (unit !== undefined) {
          return unit;
        }
      }
    } else if (content instanceof ContentType) {
      const unit = flow.byEnd.get(idString(n.id));
      if (unit !== undefined) {
        return unit;
      }
    } else if (!(content instanceof ContentFormat) && n.length > 0) {
      // Garbage-collected content: any of its ids can end a unit.
      for (let i = 0; i < n.length; i++) {
        const unit = flow.byEnd.get(`${n.id.client}:${n.id.clock + i}`);
        if (unit !== undefined) {
          return unit;
        }
      }
    }
  }
  return null;
}

/**
 * Fills in the ends of units written before their flow was part of the
 * document (a container created locally): one walk over the flow as it was
 * before `event`'s transaction (its items' ids are stable), matching markers
 * and embeds to units in order. Returns whether every end is now known.
 */
function refreshEnds(flow: FlowState, event: YTextEvent): boolean {
  const {transaction} = event;
  const isNew = (item: YItem) =>
    item.id.clock >= (transaction.beforeState.get(item.id.client) || 0);
  const deletedNow = new Set<YItem>();
  iterateDeletedStructs(transaction, transaction.deleteSet, struct => {
    if (struct instanceof YItem) {
      deletedNow.add(struct);
    }
  });
  const ends: string[] = [];
  for (let n = flow.text._start; n !== null; n = n.right) {
    // The view before the transaction: skip its insertions, keep what it
    // deleted.
    if (isNew(n) || (n.deleted && !deletedNow.has(n))) {
      continue;
    }
    const content = n.content;
    if (content instanceof ContentString) {
      const str = content.str;
      for (
        let i = str.indexOf(MARKER_CHAR);
        i !== -1;
        i = str.indexOf(MARKER_CHAR, i + 1)
      ) {
        ends.push(`${n.id.client}:${n.id.clock + i}`);
      }
    } else if (content instanceof ContentType) {
      ends.push(idString(n.id));
    }
  }
  let k = 0;
  for (const unit of flow.units) {
    if (unit.kind === 'line' && markerOf(unit) !== null) {
      if (k >= ends.length) {
        return false;
      }
      unit.markerId = ends[k++];
    } else if (unit.kind === 'embed') {
      k++;
    }
  }
  if (k !== ends.length) {
    return false;
  }
  indexFlow(flow);
  return flow.unknownEnds === 0;
}

/**
 * The range of cached units a transaction changed in a flow, found from the
 * items it inserted and deleted there (each item belongs to the unit whose
 * end follows it), without computing the event's delta.
 */
function $locateChange(
  flow: FlowState,
  event: YTextEvent,
): 'none' | 'unknown' | {first: number; last: number} {
  if (flow.unknownEnds > 0 && !refreshEnds(flow, event)) {
    return 'unknown';
  }
  const {transaction} = event;
  const text = flow.text;
  const doc = transaction.doc;
  const items: YItem[] = [];
  transaction.afterState.forEach((after, client) => {
    const before = transaction.beforeState.get(client) || 0;
    if (after <= before) {
      return;
    }
    const structs = doc.store.clients.get(client);
    if (structs === undefined) {
      return;
    }
    for (
      let i = findIndexSS(structs, before);
      i < structs.length && structs[i].id.clock < after;
      i++
    ) {
      const struct = structs[i];
      if (struct instanceof YItem && struct.parent === text) {
        items.push(struct);
      }
    }
  });
  iterateDeletedStructs(transaction, transaction.deleteSet, struct => {
    if (struct instanceof YItem && struct.parent === text) {
      items.push(struct);
    }
  });
  if (items.length === 0) {
    return 'none';
  }
  let first = Infinity;
  let last = -1;
  const indexAfter = (item: YItem) => {
    const unit = unitAfter(flow, item);
    return unit === null ? flow.units.length : unitIndex(flow, unit);
  };
  if (items.length > LINEAR_LOCATE_THRESHOLD) {
    // Many changed items (a paste, a change to many markers): one pass over
    // the flow instead of one walk per item.
    const range = locateLinear(flow, new Set(items));
    first = range.first;
    last = range.last;
    items.length = 0;
  }
  for (const item of items) {
    const index = indexAfter(item);
    first = Math.min(first, index);
    last = Math.max(last, index);
    const content = item.content;
    if (content instanceof ContentFormat) {
      // A format applies up to the next format of the same key, which can be
      // in a later unit.
      let next: YItem | null = item.right;
      while (
        next !== null &&
        !(
          !next.deleted &&
          next.content instanceof ContentFormat &&
          next.content.key === content.key
        )
      ) {
        next = next.right;
      }
      last = Math.max(
        last,
        next === null ? flow.units.length : indexAfter(next),
      );
    }
  }
  // After every known end: the last unit if nothing ends it, or new units.
  const n = flow.units.length;
  if (first === n) {
    const lastUnit = n > 0 ? flow.units[n - 1] : null;
    if (lastUnit !== null && unitEndId(lastUnit) === null) {
      first = n - 1;
    }
  }
  // `last === n`: the change reaches past every known end, so the read goes
  // to the end of the flow.
  return {first, last};
}

const LINEAR_LOCATE_THRESHOLD = 32;

/** The offsets of the unit ends (cached ends) inside an item. */
function endsInItem(
  flow: FlowState,
  item: YItem,
): {offset: number; unit: Unit}[] {
  const content = item.content;
  const ends: {offset: number; unit: Unit}[] = [];
  const at = (offset: number) => {
    const unit = flow.byEnd.get(`${item.id.client}:${item.id.clock + offset}`);
    if (unit !== undefined) {
      ends.push({offset, unit});
    }
  };
  if (content instanceof ContentString) {
    const str = content.str;
    for (
      let i = str.indexOf(MARKER_CHAR);
      i !== -1;
      i = str.indexOf(MARKER_CHAR, i + 1)
    ) {
      at(i);
    }
  } else if (content instanceof ContentType) {
    at(0);
  } else if (!(content instanceof ContentFormat)) {
    // Garbage-collected content: any of its ids can end a unit.
    for (let i = 0; i < item.length; i++) {
      at(i);
    }
  }
  return ends;
}

/**
 * $locateChange in one pass over the flow's items: each changed item
 * touches the unit whose cached end follows it, and a changed format item
 * every unit up to the next format item of its key.
 */
function locateLinear(
  flow: FlowState,
  changed: Set<YItem>,
): {first: number; last: number} {
  let first = Infinity;
  let last = -1;
  let pending = false;
  const openKeys = new Set<string>();
  const touch = (index: number) => {
    first = Math.min(first, index);
    last = Math.max(last, index);
  };
  for (let n = flow.text._start; n !== null; n = n.right) {
    const isChanged = changed.has(n);
    const content = n.content;
    if (content instanceof ContentFormat) {
      if (!isChanged && !n.deleted && openKeys.delete(content.key)) {
        pending = true;
      }
      if (isChanged) {
        openKeys.add(content.key);
        pending = true;
      }
      continue;
    }
    if (isChanged) {
      pending = true;
    }
    const ends = endsInItem(flow, n);
    for (const {unit, offset} of ends) {
      if (pending) {
        touch(unitIndex(flow, unit));
      }
      pending = openKeys.size > 0 || (isChanged && offset < n.length - 1);
    }
  }
  if (pending) {
    touch(flow.units.length);
  }
  return {first, last};
}

/**
 * Reads units from the start of unit `i0` up to and including the first unit
 * at or after `target` whose end is still in the flow (or to the end of the
 * flow): one walk from the end of unit `i0 - 1`.
 */
function readUnits(
  flow: FlowState,
  i0: number,
  target: number,
): {ops: RangeOp[]; end: number} | null {
  const {units, text} = flow;
  let start: YItem | null = text._start;
  let offset = 0;
  let attrs: Attrs = {};
  if (i0 > 0) {
    const prev = units[i0 - 1];
    const id = unitEndId(prev);
    if (typeof id !== 'string' || text.doc === null) {
      return null;
    }
    const sep = id.indexOf(':');
    const client = Number(id.slice(0, sep));
    const clock = Number(id.slice(sep + 1));
    const item = getItem(text.doc.store, createID(client, clock));
    if (!(item instanceof YItem) || item.deleted) {
      return null;
    }
    start = item;
    offset = clock - item.id.clock + 1;
    const lastOp = prev.ops[prev.ops.length - 1];
    attrs = lastOp === undefined ? {} : lastOp.attributes;
  }
  let end = units.length;
  const {ops} = readFlowItems(start, offset, attrs, 0, Infinity, id => {
    const unit = flow.byEnd.get(id);
    if (unit === undefined) {
      return false;
    }
    const index = unitIndex(flow, unit);
    if (index >= target && index >= i0) {
      end = index + 1;
      return true;
    }
    return false;
  });
  return {end, ops};
}

/**
 * @internal Yjs -> Lexical for a remote change to a flow: only the units the
 * change touches are read back and rebuilt.
 */
export function $syncFlowEvent(
  binding: BindingV2,
  text: XmlText,
  event: YTextEvent,
): void {
  $syncFlowEventInner(binding, text, event);
  const el = text.parent;
  const container = el instanceof XmlElement ? binding.mapping.get(el) : null;
  if (container instanceof ElementNode && container.isAttached()) {
    $repairSelection(container.getLatest());
  }
}

function $syncFlowEventInner(
  binding: BindingV2,
  text: XmlText,
  event: YTextEvent,
): void {
  const el = text.parent;
  if (!(el instanceof XmlElement)) {
    return;
  }
  const container = binding.mapping.get(el);
  if (!(container instanceof ElementNode) || !container.isAttached()) {
    return;
  }
  const store = getStore(binding);
  const flow = store.flows.get(text);
  if (flow === undefined || flow.container.el !== el) {
    $readFlowContainer(el, container, binding);
    return;
  }
  const located = $locateChange(flow, event);
  if (located === 'none') {
    return;
  }
  if (located === 'unknown') {
    // The cache cannot locate the change: read the container whole.
    $readFlowContainer(el, container, binding);
    return;
  }
  const {units} = flow;
  let i0 = located.first;
  const target = located.last;
  // Content after a unit that no marker ends (a tail, or an implicit line)
  // continues that unit.
  while (
    i0 > 0 &&
    units[i0 - 1].kind !== 'embed' &&
    markerOf(units[i0 - 1]) === null
  ) {
    i0--;
  }
  let j1 = i0;
  const read = (): ParsedUnit[] | null => {
    const result = readUnits(flow, i0, target);
    if (result === null) {
      return null;
    }
    j1 = result.end;
    return parseOps(
      result.ops,
      binding,
      $isRootOrShadowRoot(container) || units.some(u => markerOf(u) !== null),
    );
  };
  let parsed = read();
  if (parsed === null) {
    $readFlowContainer(el, container, binding);
    return;
  }
  const hasOtherBlocks = () =>
    units.some((u, i) => (i < i0 || i >= j1) && u.kind === 'line');
  parsed = implicitLines(parsed, container, hasOtherBlocks());
  const oldUnits = units.slice(i0, j1);
  const inPlace =
    parsed.length === oldUnits.length &&
    parsed.every((p, i) => {
      const o = oldUnits[i];
      return (
        p.kind === o.kind &&
        p.kind !== 'tail' &&
        (p.kind === 'embed'
          ? p.el === o.ops[0].insert
          : p.groupItem === o.groupItem &&
            groupSig(p.marker) === groupSig(markerOf(o)))
      );
    });
  if (inPlace) {
    const reuse = makeReuse(oldUnits, []);
    reuse.leftovers = oldUnits.map(u => u.key);
    const keys = parsed.map((p, i) => {
      if (p.kind === 'line') {
        reuse.leftovers = [oldUnits[i].key];
        const line = $materializeLine(p, reuse, binding);
        const old = $getNodeByKey(oldUnits[i].key);
        if (old !== null && !old.is(line) && old.isAttached()) {
          old.replace(line);
          $repairSelection(line);
        }
        const parent = line.getParent();
        if (
          old !== null &&
          !old.is(line) &&
          p.groupItem &&
          isGroupNode(parent)
        ) {
          // A replaced item: its group's derived fields (list numbering) are
          // refreshed. Content changes leave them alone.
          store.refresh.add(parent.getKey());
        }
        return [line.getKey()];
      }
      return [oldUnits[i].key];
    });
    spliceUnits(flow, i0, j1 - i0, makeUnits(flow, parsed, keys));
    return;
  }
  // Structural. Only the changed units were read; the group items around
  // them (which may now group differently) are regrouped from the cache.
  let g0 = i0;
  let g1 = j1;
  while (g0 > 0 && units[g0 - 1].groupItem) {
    g0--;
  }
  while (g1 < units.length && units[g1].groupItem) {
    g1++;
  }
  const cachedAvailable = [
    ...units.slice(g0, i0),
    ...units.slice(j1, g1),
  ].every(u => {
    const n = $getNodeByKey(u.key);
    return n instanceof ElementNode && n.isAttached();
  });
  if (!cachedAvailable) {
    $readFlowContainer(el, container, binding);
    return;
  }
  const region = units.slice(g0, g1);
  const oldTop: LexicalNode[] = [];
  const seen = new Set<NodeKey>();
  for (const u of region) {
    const nodes =
      u.kind === 'tail'
        ? u.keys.map(k => $getNodeByKey(k))
        : [$topOf(u, container)];
    for (const n of nodes) {
      if (n !== null && !seen.has(n.getKey())) {
        seen.add(n.getKey());
        oldTop.push(n);
      }
    }
  }
  let prevTop: LexicalNode | null = null;
  if (g0 > 0) {
    prevTop = $topOf(units[g0 - 1], container);
  } else {
    const flows = flow.container.flows;
    for (let f = flows.indexOf(flow) - 1; f >= 0 && prevTop === null; f--) {
      const fu = flows[f].units;
      if (fu.length > 0) {
        prevTop = $topOf(fu[fu.length - 1], container);
      }
    }
  }
  const reuse = makeReuse(oldUnits, parsed);
  const before = units.slice(g0, i0);
  const after = units.slice(j1, g1);
  const {top, keys, groups} = $materializeUnits(
    [...before, ...parsed, ...after],
    reuse,
    binding,
    container,
  );
  $placeTop(container.getLatest(), prevTop, top, oldTop);
  $repairSelection(top.length > 0 ? top[0] : container);
  for (const g of groups) {
    store.refresh.add(g.getKey());
  }
  const parsedKeys = keys.slice(before.length, before.length + parsed.length);
  spliceUnits(flow, i0, j1 - i0, makeUnits(flow, parsed, parsedKeys));
}

/**
 * @internal An embedded element's WRAPPERS_ATTR_KEY changed: re-read the
 * line that holds it.
 */
export function $syncEmbedWrappers(binding: BindingV2, el: XmlElement): void {
  const text = el.parent;
  if (!(text instanceof XmlText)) {
    return;
  }
  const flow = getStore(binding).flows.get(text);
  const node = binding.mapping.get(el);
  if (flow === undefined || node === undefined) {
    return;
  }
  for (let n: LexicalNode | null = node; n !== null; n = n.getParent()) {
    const unit = flow.container.byKey.get(n.getKey());
    if (unit !== undefined && unit.kind === 'line') {
      startOf(flow, unit);
      const parsed = parseOps(
        readFlowRange(text, unit.start, unit.start + unit.len),
        binding,
        true,
      );
      if (parsed.length === 1 && parsed[0].kind === 'line') {
        const reuse = makeReuse([unit], parsed);
        reuse.leftovers = [unit.key];
        const line = $materializeLine(parsed[0], reuse, binding);
        if (!line.is(n) && n.isAttached()) {
          n.replace(line);
        }
        spliceUnits(
          flow,
          unit.index,
          1,
          makeUnits(flow, parsed, [[line.getKey()]]),
        );
      }
      return;
    }
  }
}

// ---------------------------------------------------------------------------
// Cursors

/** The size of a node in its flow (format wrappers are transparent). */
function $flowSize(node: LexicalNode): number {
  if ($isTextNode(node)) {
    return node.getTextContentSize();
  }
  if ($isFormatWrapper(node)) {
    let size = 0;
    for (const c of node.getChildren()) {
      size += $flowSize(c);
    }
    return size;
  }
  return 1;
}

function $containerStateOf(
  node: LexicalNode,
  binding: BindingV2,
): ContainerState | undefined {
  const el = binding.mapping.getSharedType(node);
  return el instanceof XmlElement
    ? getStore(binding).containers.get(el)
    : undefined;
}

/** The unit that holds `node`, and the node under which it is indexed. */
function $unitOf(
  node: LexicalNode,
  binding: BindingV2,
): {unit: Unit; owner: LexicalNode} | null {
  for (let n: LexicalNode | null = node; n !== null; n = n.getParent()) {
    for (
      let c: ElementNode | null = n.getParent();
      c !== null;
      c = c.getParent()
    ) {
      const cs = $containerStateOf(c, binding);
      if (cs !== undefined) {
        const unit = cs.byKey.get(n.getKey());
        if (unit !== undefined) {
          return {owner: n, unit};
        }
        break;
      }
    }
  }
  return null;
}

/** Offset of the start of `target` (a descendant of `root`) in its unit. */
function $offsetWithin(root: LexicalNode, target: LexicalNode): number | null {
  let offset = 0;
  const visit = (parent: ElementNode): boolean => {
    for (const c of parent.getChildren()) {
      if (c.is(target)) {
        return true;
      }
      if ($isFormatWrapper(c)) {
        if (visit(c)) {
          return true;
        }
      } else {
        offset += $flowSize(c);
      }
    }
    return false;
  };
  if (root.is(target)) {
    return 0;
  }
  return root instanceof ElementNode && visit(root) ? offset : null;
}

/** Whether `node` is itself indexed as a unit (a line, embed or tail node). */
function $ownsUnit(node: LexicalNode, binding: BindingV2): boolean {
  const found = $unitOf(node, binding);
  return found !== null && found.owner.is(node);
}

/**
 * @internal The flow position of a selection point in the block-marker
 * layout, or null when the point is not in a flow.
 */
export function $flowPositionOfPoint(
  key: NodeKey,
  offset: number,
  type: 'text' | 'element',
  binding: BindingV2,
): {text: XmlText; index: number} | null {
  const node = $getNodeByKey(key);
  if (node === null) {
    return null;
  }
  if (type === 'element' && node instanceof ElementNode) {
    const cs = $containerStateOf(node, binding);
    if (cs !== undefined && !$ownsUnit(node, binding)) {
      // A point between the children of a container.
      const child = node.getChildAtIndex(offset);
      if (child === null) {
        const flow = cs.flows[cs.flows.length - 1];
        return flow ? {index: flowLength(flow), text: flow.text} : null;
      }
      let first: LexicalNode = child;
      while (
        first instanceof ElementNode &&
        isGroupPart(first) &&
        !cs.byKey.has(first.getKey()) &&
        first.getFirstChild() !== null
      ) {
        first = first.getFirstChild()!;
      }
      const unit = cs.byKey.get(first.getKey());
      return unit === undefined
        ? null
        : {index: startOf(unit.flow, unit), text: unit.flow.text};
    }
  }
  const found = $unitOf(node, binding);
  if (found === null) {
    return null;
  }
  const {unit, owner} = found;
  const base = startOf(unit.flow, unit);
  let within: number | null;
  if (unit.kind === 'embed') {
    within = 0;
  } else if (type === 'text') {
    const root = unit.kind === 'tail' ? owner.getParent()! : owner;
    const before = $offsetWithin(root, node);
    within = before === null ? null : before + offset;
  } else if (node instanceof ElementNode) {
    const child = node.getChildAtIndex(offset);
    const root = unit.kind === 'tail' ? owner.getParent()! : owner;
    if (child === null) {
      const before = $offsetWithin(root, node);
      within = before === null ? null : before + $flowSize(node);
      if (node.is(owner)) {
        within = 0;
        for (const c of node.getChildren()) {
          within += $flowSize(c);
        }
      }
    } else {
      within = $offsetWithin(root, child);
    }
  } else {
    within = null;
  }
  if (within === null) {
    return null;
  }
  if (unit.kind === 'tail') {
    // A tail unit's offset counts from its first node.
    const first = $getNodeByKey(unit.keys[0]);
    const parent = first === null ? null : first.getParent();
    const shift =
      parent === null || first === null ? null : $offsetWithin(parent, first);
    within -= shift === null ? 0 : shift;
  }
  return {
    index: base + Math.max(0, Math.min(within, unit.len)),
    text: unit.flow.text,
  };
}

/**
 * @internal The Lexical point of a flow position: a text node and offset, or
 * an element and child index. Null when `text` is not a flow of this binding.
 */
export function $pointOfFlowPosition(
  text: XmlText,
  index: number,
  binding: BindingV2,
): [LexicalNode | null, number] | null {
  const flow = getStore(binding).flows.get(text);
  if (flow === undefined) {
    return null;
  }
  const {units} = flow;
  if (units.length === 0) {
    const container = binding.mapping.get(flow.container.el);
    return container !== undefined && container.isAttached()
      ? [container, 0]
      : [null, 0];
  }
  const last = units[units.length - 1];
  startOf(flow, last);
  let lo = 0;
  let hi = units.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (units[mid].start <= index) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  const unit = units[lo];
  let offset = index - unit.start;
  const owner = $getNodeByKey(unit.key);
  if (owner === null || !owner.isAttached()) {
    // A flow whose container was removed (a deleted table's cell).
    return [null, 0];
  }
  if (unit.kind === 'embed') {
    const parent = owner.getParent();
    return [parent, owner.getIndexWithinParent()];
  }
  const nodes =
    unit.kind === 'tail'
      ? unit.keys
          .map(k => $getNodeByKey(k))
          .filter((n): n is LexicalNode => n !== null)
      : (owner as ElementNode).getChildren();
  let result: [LexicalNode | null, number] | null = null;
  let lastText: TextLike | null = null;
  const visit = (children: LexicalNode[]): boolean => {
    for (const c of children) {
      if ($isFormatWrapper(c)) {
        if (visit(c.getChildren())) {
          return true;
        }
        continue;
      }
      const size = $flowSize(c);
      if ($isTextNode(c)) {
        lastText = c;
        if (offset <= size) {
          result = [c, offset];
          return true;
        }
      } else if (offset === 0) {
        result = [c.getParent(), c.getIndexWithinParent()];
        return true;
      }
      offset -= size;
    }
    return false;
  };
  if (visit(nodes)) {
    return result;
  }
  if (lastText !== null) {
    const t: TextLike = lastText;
    return [t, t.getTextContentSize()];
  }
  return unit.kind === 'line'
    ? [owner, (owner as ElementNode).getChildrenSize()]
    : [owner.getParent(), owner.getIndexWithinParent()];
}

type TextLike = LexicalNode & {getTextContentSize(): number};

// ---------------------------------------------------------------------------
// Transforms

/** Whether a group's structure is what a reader builds from its items. */
function $matchesFrame(node: LexicalNode, frame: GroupFrame): boolean {
  if (
    !(node instanceof ElementNode) ||
    node.getType() !== frame.type ||
    frame.type + '\u0000' + stableStringify($groupKeyAttrs(node)) !==
      frame.keyStr
  ) {
    return false;
  }
  const children = node.getChildren();
  if (children.length !== frame.children.length) {
    return false;
  }
  return frame.children.every((c, i) => {
    const child = children[i];
    if (c instanceof ElementNode) {
      return child.is(c);
    }
    const nested = $getNestedGroup(child, node);
    return nested !== null && $matchesFrame(nested, c.group);
  });
}

/**
 * Rebuilds a local group, with the groups next to it, in the shape every
 * reader builds from their items: consecutive items with equal key fields in
 * one group (Lexical only merges a list into the one before it when the
 * earlier list changes), nesting levels as wrapper items.
 */
function $canonicalizeGroup(top: ElementNode, binding: BindingV2): void {
  const run: ElementNode[] = [top];
  for (
    let n = top.getPreviousSibling();
    isGroupNode(n);
    n = n.getPreviousSibling()
  ) {
    run.unshift(n);
  }
  for (let n = top.getNextSibling(); isGroupNode(n); n = n.getNextSibling()) {
    run.push(n);
  }
  const units: DesiredUnit[] = [];
  const valid: ElementNode[] = [];
  for (const group of run) {
    const start = units.length;
    if ($flattenGroup(group, 0, false, units)) {
      valid.push(group);
    } else {
      units.length = start;
      if (valid.length > 0 && valid[valid.length - 1] !== group) {
        // An invalid group (stored as an embed) ends the run.
        break;
      }
    }
  }
  if (valid.length === 0) {
    return;
  }
  const items: GroupItem[] = units.map(u => {
    const line = u as Extract<DesiredUnit, {kind: 'line'}>;
    return {
      keyAttrs: $groupKeyAttrs(line.group!),
      level: line.level,
      node: line.node,
      type: line.group!.getType(),
    };
  });
  const frames = buildGroupFrames(items);
  if (
    frames.length === valid.length &&
    frames.every((frame, i) => $matchesFrame(valid[i], frame))
  ) {
    return;
  }
  const container = valid[0].getParent();
  if (container === null) {
    return;
  }
  const built = $materializeGroups(frames, new Set(), binding);
  $placeTop(container, valid[0].getPreviousSibling(), built, valid);
}

/**
 * @internal Registered once a binding's document is in the block-marker
 * layout: rebuilds locally changed groups in canonical shape (in the same
 * update), and refreshes groups rebuilt by remote reads (which skip
 * transforms) so their own transforms (list numbering) run.
 */
export function registerBlockLayoutTransforms(binding: BindingV2): () => void {
  const {editor} = binding;
  const unregister: (() => void)[] = [];
  const done = new Set<NodeKey>();
  for (const [, {klass}] of editor._nodes) {
    if (getGroupSpec(klass) === null) {
      continue;
    }
    unregister.push(
      editor.registerNodeTransform(klass, node => {
        let top: LexicalNode = node;
        for (;;) {
          const parent: ElementNode | null = top.getParent();
          if (parent === null || !isGroupPart(parent)) {
            break;
          }
          top = parent;
        }
        if (
          // Groups a remote read rebuilt are in canonical shape already.
          $hasUpdateTag(BLOCK_REFRESH_TAG) ||
          !isGroupNode(top) ||
          !top.isAttached() ||
          done.has(top.getKey()) ||
          editor.isComposing()
        ) {
          return;
        }
        done.add(top.getKey());
        $canonicalizeGroup(top, binding);
      }),
    );
  }
  const flushRefresh = () => {
    const store = stores.get(binding);
    if (store === undefined || store.refresh.size === 0) {
      return;
    }
    const keys = Array.from(store.refresh);
    store.refresh.clear();
    editor.update(
      () => {
        $addUpdateTag(BLOCK_REFRESH_TAG);
        for (const key of keys) {
          const n = $getNodeByKey(key);
          if (n !== null && n.isAttached()) {
            n.markDirty();
          }
        }
      },
      // Discrete, so that it is not batched into a remote update, which
      // skips transforms.
      {discrete: true, tag: HISTORY_MERGE_TAG},
    );
  };
  // A U+2029 typed into text is written as U+2028 (a U+2029 in a flow ends a
  // line); change the local text to match.
  const fixSeparators = (dirtyLeaves: Set<NodeKey>) => {
    const keys: NodeKey[] = [];
    editor.getEditorState().read(() => {
      for (const key of dirtyLeaves) {
        const node = $getNodeByKey(key);
        if ($isTextNode(node) && node.getTextContent().includes(MARKER_CHAR)) {
          keys.push(key);
        }
      }
    });
    if (keys.length > 0) {
      editor.update(
        () => {
          for (const key of keys) {
            const node = $getNodeByKey(key);
            if ($isTextNode(node)) {
              node.setTextContent(
                node.getTextContent().split(MARKER_CHAR).join(LINE_SEPARATOR),
              );
            }
          }
        },
        {discrete: true, tag: HISTORY_MERGE_TAG},
      );
    }
  };
  unregister.push(
    editor.registerUpdateListener(({dirtyLeaves}) => {
      done.clear();
      flushRefresh();
      if (dirtyLeaves.size > 0) {
        fixSeparators(dirtyLeaves);
      }
    }),
  );
  flushRefresh();
  return () => unregister.forEach(fn => fn());
}
