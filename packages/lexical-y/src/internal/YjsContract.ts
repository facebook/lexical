/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  applyUpdate,
  ContentAny,
  ContentBinary,
  ContentFormat,
  ContentString,
  ContentType,
  createID,
  createIdSet,
  createRelativePositionFromJSON,
  decodeUpdate,
  Doc,
  encodeStateAsUpdate,
  findIndexSS,
  findRootTypeKey,
  GC,
  getItemCleanStart,
  type ID,
  type IdSet,
  Item,
  iterateStructsByIdSet,
  mergeUpdates,
  Node as YNode,
  RelativePosition,
  relativePositionToJSON,
  Skip,
  type Transaction,
  UndoManager,
} from '@y/y';

import {SUPPORTED_YJS_VERSION} from './SupportedYjs';

/*
 * The Yjs contract: what @lexical/y uses of @y/y, and a check that the @y/y
 * the app loaded provides it.
 *
 * The binding is coupled to one exact @y/y version on purpose: it writes
 * through its own cursor on Yjs items and reads struct fields that are not
 * public API (see Cursor). A package manager only warns about a peer
 * dependency it cannot satisfy (pnpm by default, npm with
 * --legacy-peer-deps), so an app can still run another @y/y. @y/y exposes no
 * version at run time (its `package.json` subpath is not something every
 * bundler or runtime can import), so the check probes the contract itself,
 * once per module, on a scratch document: every export below is a
 * function, every member below has the kind of value the binding expects on
 * an object of that kind, and every event below fires. Any difference
 * refuses the binding with a YUnsupportedYjsError before it writes anything.
 *
 * Members are checked through property reads typed against @y/y's
 * declarations (not by name), so tsc fails on a member the declarations
 * drop, and a build that renames properties renames them here as it does in
 * the binding. Arities are not compared: transpilers change
 * `Function#length` (default and destructured parameters).
 *
 * The lists are the contract. YjsContract.test derives, with the TypeScript
 * checker, everything the package's sources use of @y/y (value imports,
 * `new`, members, destructured fields, options and event names) and fails
 * when it differs from these lists in either direction: a new use of a Yjs
 * export, field, method, option or event lands with its entry here.
 */

/** The value exports of @y/y the binding uses. */
export const YJS_EXPORTS = [
  'ContentAny',
  'ContentBinary',
  'ContentFormat',
  'ContentString',
  'ContentType',
  'Doc',
  'Item',
  'Node',
  'RelativePosition',
  'Skip',
  'UndoManager',
  'applyUpdate',
  'createID',
  'createIdSet',
  'createRelativePositionFromJSON',
  'decodeUpdate',
  'encodeStateAsUpdate',
  'findIndexSS',
  'findRootTypeKey',
  'getItemCleanStart',
  'iterateStructsByIdSet',
  'mergeUpdates',
  'relativePositionToJSON',
] as const;

type StructStore = Doc['store'];
type IdRanges = NonNullable<ReturnType<IdSet['clients']['get']>>;
type IdRange = ReturnType<IdRanges['getIds']>[number];
type StackItem = UndoManager['undoStack'][number];
type AbstractContent = Item['content'];
type DecodedUpdate = ReturnType<typeof decodeUpdate>;
interface StackItemEvent {
  stackItem: StackItem;
  origin: unknown;
}

const isFunction = (value: unknown): boolean => typeof value === 'function';
const isObject = (value: unknown): boolean =>
  typeof value === 'object' && value !== null;
/** A field that may hold null (an empty pointer), never undefined. */
const isSet = (value: unknown): boolean => value !== undefined;
const isNumber = (value: unknown): boolean => typeof value === 'number';
const isBoolean = (value: unknown): boolean => typeof value === 'boolean';

/**
 * The members (fields, getters, methods) the binding reads or calls, by the
 * name of the @y/y type that declares them, each with the check of its
 * value. `DocOpts` and `UndoManagerOptions` are constructor options the
 * binding passes (checked on what the constructor kept); `StackItemEvent`
 * is the payload of the undo manager's stack events; `decodeUpdate` is that
 * function's result.
 *
 * @__NO_SIDE_EFFECTS__
 */
export function yjsMembers() {
  return {
    AbstractContent: {
      getContent: (c: AbstractContent) => isFunction(c.getContent),
    },
    ContentFormat: {
      key: (c: ContentFormat) => typeof c.key === 'string',
      value: (c: ContentFormat) => isSet(c.value),
    },
    ContentString: {
      str: (c: ContentString) => typeof c.str === 'string',
    },
    ContentType: {
      type: (c: ContentType) => isObject(c.type),
    },
    Doc: {
      _transaction: (d: Doc) => isSet(d._transaction),
      _transactionCleanups: (d: Doc) => Array.isArray(d._transactionCleanups),
      cleanupFormatting: (d: Doc) => isBoolean(d.cleanupFormatting),
      clientID: (d: Doc) => isNumber(d.clientID),
      destroy: (d: Doc) => isFunction(d.destroy),
      get: (d: Doc) => isFunction(d.get),
      off: (d: Doc) => isFunction(d.off),
      on: (d: Doc) => isFunction(d.on),
      share: (d: Doc) => d.share instanceof Map,
      store: (d: Doc) => isObject(d.store),
      transact: (d: Doc) => isFunction(d.transact),
    },
    DocOpts: {
      gc: (d: Doc) => d.gc === false,
    },
    GC: {
      id: (g: GC) => isObject(g.id),
    },
    ID: {
      client: (id: ID) => isNumber(id.client),
      clock: (id: ID) => isNumber(id.clock),
    },
    IdRange: {
      clock: (r: IdRange) => isNumber(r.clock),
      len: (r: IdRange) => isNumber(r.len),
    },
    IdRanges: {
      getIds: (r: IdRanges) => isFunction(r.getIds),
    },
    IdSet: {
      add: (s: IdSet) => isFunction(s.add),
      clients: (s: IdSet) => s.clients instanceof Map,
      hasId: (s: IdSet) => isFunction(s.hasId),
    },
    Item: {
      content: (it: Item) => isObject(it.content),
      countable: (it: Item) => isBoolean(it.countable),
      delete: (it: Item) => isFunction(it.delete),
      deleted: (it: Item) => isBoolean(it.deleted),
      id: (it: Item) => isObject(it.id),
      integrate: (it: Item) => isFunction(it.integrate),
      lastId: (it: Item) => isObject(it.lastId),
      left: (it: Item) => isSet(it.left),
      length: (it: Item) => isNumber(it.length),
      origin: (it: Item) => isSet(it.origin),
      parent: (it: Item) => isSet(it.parent),
      parentSub: (it: Item) => isSet(it.parentSub),
      redone: (it: Item) => isSet(it.redone),
      right: (it: Item) => isSet(it.right),
      rightOrigin: (it: Item) => isSet(it.rightOrigin),
    },
    RelativePosition: {
      assoc: (p: RelativePosition) => isNumber(p.assoc),
      item: (p: RelativePosition) => isSet(p.item),
    },
    StackItem: {
      deletes: (s: StackItem) => isObject(s.deletes),
      inserts: (s: StackItem) => isObject(s.inserts),
      meta: (s: StackItem) => s.meta instanceof Map,
    },
    StackItemEvent: {
      origin: (e: StackItemEvent) => isSet(e.origin),
      stackItem: (e: StackItemEvent) => isObject(e.stackItem),
    },
    StructStore: {
      clients: (s: StructStore) => s.clients instanceof Map,
      getClock: (s: StructStore) => isFunction(s.getClock),
      getItem: (s: StructStore) => isFunction(s.getItem),
    },
    Transaction: {
      changed: (tr: Transaction) => tr.changed instanceof Map,
      deleteSet: (tr: Transaction) => isObject(tr.deleteSet),
      doc: (tr: Transaction) => isObject(tr.doc),
      insertSet: (tr: Transaction) => isObject(tr.insertSet),
      origin: (tr: Transaction) => isSet(tr.origin),
    },
    UndoManager: {
      canRedo: (u: UndoManager) => isFunction(u.canRedo),
      canUndo: (u: UndoManager) => isFunction(u.canUndo),
      clear: (u: UndoManager) => isFunction(u.clear),
      destroy: (u: UndoManager) => isFunction(u.destroy),
      on: (u: UndoManager) => isFunction(u.on),
      redo: (u: UndoManager) => isFunction(u.redo),
      redoStack: (u: UndoManager) => Array.isArray(u.redoStack),
      undo: (u: UndoManager) => isFunction(u.undo),
      undoStack: (u: UndoManager) => Array.isArray(u.undoStack),
    },
    UndoManagerOptions: {
      captureTimeout: (u: UndoManager) => u.captureTimeout === 0,
      deleteFilter: (u: UndoManager) => u.deleteFilter === PROBE_DELETE_FILTER,
      trackedOrigins: (u: UndoManager) => u.trackedOrigins.has(PROBE_ORIGIN),
    },
    YNode: {
      _hasFormatting: (n: YNode) => isBoolean(n._hasFormatting),
      _item: (n: YNode) => isSet(n._item),
      _map: (n: YNode) => n._map instanceof Map,
      _searchMarker: (n: YNode) => isSet(n._searchMarker),
      _start: (n: YNode) => isSet(n._start),
      deleteAttr: (n: YNode) => isFunction(n.deleteAttr),
      doc: (n: YNode) => isSet(n.doc),
      getAttr: (n: YNode) => isFunction(n.getAttr),
      getAttrs: (n: YNode) => isFunction(n.getAttrs),
      length: (n: YNode) => isNumber(n.length),
      name: (n: YNode) => isSet(n.name),
      parent: (n: YNode) => isSet(n.parent),
      setAttr: (n: YNode) => isFunction(n.setAttr),
    },
    decodeUpdate: {
      ds: (u: DecodedUpdate) => isObject(u.ds),
      structs: (u: DecodedUpdate) => Array.isArray(u.structs),
    },
  };
}

/** The undo manager options the probe passes, checked on what it kept. */
const PROBE_ORIGIN = {};
const PROBE_DELETE_FILTER = () => true;

/** The events the binding listens to, by emitter. */
export const YJS_EVENTS = {
  Doc: [
    'afterAllTransactions',
    'afterTransaction',
    'beforeObserverCalls',
    'beforeTransaction',
    'update',
  ],
  UndoManager: ['stack-cleared', 'stack-item-added', 'stack-item-popped'],
} as const;

/** @experimental The code of {@link YUnsupportedYjsError}. */
export const UNSUPPORTED_YJS_ERROR = '@lexical/y/unsupported-yjs';

/**
 * @experimental Why {@link YUnsupportedYjsError} refused:
 * - `'changed-internals'`: the `@y/y` the app loaded is not the supported
 *   version: exports, members or events the binding uses are missing or
 *   changed (`data.found` names them).
 * - `'other-copy'`: the document comes from another copy of `@y/y` than
 *   the one `@lexical/y` loaded, so the binding's `instanceof` checks on its
 *   items would fail.
 */
export type YUnsupportedYjsReason = 'changed-internals' | 'other-copy';

/** @experimental The data of {@link YUnsupportedYjsError}. */
export interface YUnsupportedYjsData {
  /** The exact `@y/y` version this `@lexical/y` supports. */
  readonly supported: string;
  /**
   * What the check found instead: for `'changed-internals'`, each missing
   * or changed part of the contract (`'getItemCleanStart'`,
   * `'Item#parentSub'`, `'UndoManager@stack-cleared'`);
   * for `'other-copy'`, what came from the other copy.
   */
  readonly found: readonly string[];
  readonly reason: YUnsupportedYjsReason;
}

/**
 * @experimental Thrown by `createYDoc`, by the `YBinding` constructor (so by
 * `YCollabExtension`) and by the headless helpers when the `@y/y` the app
 * runs is not the one `@lexical/y` supports, before anything is written.
 * Fix: install exactly `@y/y@<data.supported>`, once per app. There is no
 * way to turn the check off.
 */
export class YUnsupportedYjsError extends Error {
  readonly code: typeof UNSUPPORTED_YJS_ERROR;
  readonly data: YUnsupportedYjsData;
  constructor(data: YUnsupportedYjsData) {
    super(unsupportedYjsMessage(data));
    this.name = 'YUnsupportedYjsError';
    this.code = UNSUPPORTED_YJS_ERROR;
    this.data = Object.freeze({
      ...data,
      found: Object.freeze(data.found.slice()),
    });
  }
}

function unsupportedYjsMessage({
  found,
  reason,
  supported,
}: YUnsupportedYjsData): string {
  if (reason === 'other-copy') {
    return `@lexical/y: the ${found.join(' and ')} comes from another copy of @y/y than the one @lexical/y loaded. Install @y/y@${supported} once per app and create the document with createYDoc.`;
  }
  const shown = found.slice(0, 5).join(', ');
  const more = found.length > 5 ? `, and ${found.length - 5} more` : '';
  return `@lexical/y supports exactly @y/y ${supported}, and the @y/y the app loaded differs (${shown}${more}). Install @y/y@${supported}, once per app.`;
}

/**
 * The exports the check uses, named statically (a namespace import read by
 * key would keep every export of @y/y in an app's bundle). `GC` is only
 * probed, for the `GC` members.
 *
 * @__NO_SIDE_EFFECTS__
 */
function yjsExports() {
  return {
    ContentAny,
    ContentBinary,
    ContentFormat,
    ContentString,
    ContentType,
    Doc,
    GC,
    Item,
    Node: YNode,
    RelativePosition,
    Skip,
    UndoManager,
    applyUpdate,
    createID,
    createIdSet,
    createRelativePositionFromJSON,
    decodeUpdate,
    encodeStateAsUpdate,
    findIndexSS,
    findRootTypeKey,
    getItemCleanStart,
    iterateStructsByIdSet,
    mergeUpdates,
    relativePositionToJSON,
  };
}

export type YjsExports = ReturnType<typeof yjsExports>;

/**
 * Probe `y` against the contract: the list of what is missing or changed,
 * empty when it matches. Writes only to a scratch document of its own.
 */
export function probeYjs(y: YjsExports = yjsExports()): string[] {
  const found: string[] = [];
  const exportsOf = y as unknown as Record<string, unknown>;
  for (const name of [...YJS_EXPORTS, 'GC']) {
    if (typeof exportsOf[name] !== 'function') {
      found.push(name);
    }
  }
  if (found.length > 0) {
    return found;
  }
  try {
    probeMembers(y, found);
  } catch (error) {
    // Making the scratch document itself threw.
    found.push(
      `probe threw: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return found;
}

/**
 * Exercise, on a scratch document, the kinds of objects the binding meets,
 * and check every member of {@link yjsMembers} on one of each and every
 * event of {@link YJS_EVENTS}.
 */
function probeMembers(y: YjsExports, found: string[]): void {
  const samples = new Map<string, object>();
  const sample = (kind: string, value: unknown) => {
    if (!samples.has(kind) && typeof value === 'object' && value !== null) {
      samples.set(kind, value);
    }
  };
  const events = new Set<string>();
  const doc = new y.Doc({gc: false});
  sample('Doc', doc);
  sample('StructStore', doc.store);
  const um: {destroy?: () => void} = {};
  let threw: unknown = null;
  try {
    doc.cleanupFormatting = false;
    const root = doc.get('probe');
    for (const event of YJS_EVENTS.Doc) {
      doc.on(event, () => events.add(`Doc@${event}`));
    }
    const undoManager = new y.UndoManager(root, {
      captureTimeout: 0,
      deleteFilter: PROBE_DELETE_FILTER,
      trackedOrigins: new Set<unknown>([PROBE_ORIGIN]),
    });
    um.destroy = () => undoManager.destroy();
    sample('UndoManager', undoManager);
    sample('UndoManagerOptions', undoManager);
    for (const event of YJS_EVENTS.UndoManager) {
      undoManager.on(event, (payload: unknown) => {
        events.add(`UndoManager@${event}`);
        if (event === 'stack-item-added') {
          sample('StackItemEvent', payload);
          sample('StackItem', (payload as {stackItem?: unknown}).stackItem);
        }
      });
    }
    doc.transact(tr => {
      sample('Transaction', tr);
      root.insert(0, 'ab');
      root.insert(2, [new y.Node('probe')]);
      root.format(0, 1, {probe: true});
      root.setAttr('probe', 1);
    }, PROBE_ORIGIN);
    for (let it = root._start; it !== null; it = it.right) {
      sample('Item', it);
      sample('ID', it.id);
      sample('AbstractContent', it.content);
      if (it.content instanceof y.ContentString) {
        sample('ContentString', it.content);
      } else if (it.content instanceof y.ContentFormat) {
        sample('ContentFormat', it.content);
      } else if (it.content instanceof y.ContentType) {
        sample('ContentType', it.content);
        sample('YNode', it.content.type);
      }
    }
    const ids = y.createIdSet();
    ids.add(1, 0, 2);
    sample('IdSet', ids);
    const ranges = ids.clients.get(1);
    sample('IdRanges', ranges);
    sample('IdRange', ranges && ranges.getIds()[0]);
    sample('GC', new y.GC(y.createID(1, 0), 1));
    sample('RelativePosition', new y.RelativePosition(null, null, null, 0));
    sample('decodeUpdate', y.decodeUpdate(y.encodeStateAsUpdate(doc)));
    // Options are checked on what the constructor kept of them.
    sample('DocOpts', doc);
    undoManager.undo();
    undoManager.clear();
  } catch (error) {
    threw = error;
  } finally {
    try {
      if (um.destroy) {
        um.destroy();
      }
      doc.destroy();
    } catch (error) {
      threw = threw || error;
    }
  }
  // After a throw, only what was reached is checked (it usually names the
  // cause), then the throw itself.
  const members = yjsMembers() as unknown as Record<
    string,
    Record<string, (value: object) => boolean>
  >;
  for (const kind of Object.keys(members)) {
    const value = samples.get(kind);
    if (value === undefined && threw !== null) {
      continue;
    }
    for (const [member, check] of Object.entries(members[kind])) {
      let ok = false;
      try {
        ok = value !== undefined && check(value);
      } catch {
        // A getter that throws is a changed member too.
      }
      if (!ok) {
        found.push(`${kind}#${member}`);
      }
    }
  }
  if (threw !== null) {
    found.push(
      `probe threw: ${threw instanceof Error ? threw.message : String(threw)}`,
    );
    return;
  }
  for (const [emitter, names] of Object.entries(YJS_EVENTS)) {
    for (const name of names) {
      if (!events.has(`${emitter}@${name}`)) {
        found.push(`${emitter}@${name}`);
      }
    }
  }
}

/** What the check found, once per module; undefined until it ran. */
let verdict: readonly string[] | undefined;
/** How many times the check ran (YjsContract.test). */
let probeRuns = 0;

/** @internal How many times this module ran the check. */
export function getYjsProbeRuns(): number {
  return probeRuns;
}

/**
 * Throw a {@link YUnsupportedYjsError} unless the @y/y the app loaded
 * provides the contract. Probes once per module; later calls reuse the
 * verdict.
 */
export function assertSupportedYjs(): void {
  if (verdict === undefined) {
    probeRuns++;
    verdict = Object.freeze(probeYjs());
  }
  if (verdict.length > 0) {
    // A copy: what a caller does with the error's data cannot change the
    // verdict.
    throw new YUnsupportedYjsError({
      found: verdict.slice(),
      reason: 'changed-internals',
      supported: SUPPORTED_YJS_VERSION,
    });
  }
}

/**
 * Throw a {@link YUnsupportedYjsError} unless `doc` is a `Y.Doc` of the
 * @y/y this module loaded and `root`, when given, a `Y.Node` of it.
 */
export function assertOwnYjsDoc(doc: unknown, root?: unknown): void {
  const other: string[] = [];
  if (!(doc instanceof Doc)) {
    other.push('Y.Doc');
  } else if (root !== undefined && !(root instanceof YNode)) {
    other.push('Y.Node (the root)');
  }
  if (other.length > 0) {
    throw new YUnsupportedYjsError({
      found: other,
      reason: 'other-copy',
      supported: SUPPORTED_YJS_VERSION,
    });
  }
}
