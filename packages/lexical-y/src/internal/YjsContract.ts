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
  Item,
  iterateStructsByIdSet,
  mergeUpdates,
  Node as YNode,
  RelativePosition,
  relativePositionToJSON,
  Skip,
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
 * once per module, on a scratch document: every export below with the
 * arity it has in the supported version, every member below on an object
 * of that kind, and every event below firing. Any difference refuses the
 * binding with a YUnsupportedYjsError before it writes anything.
 *
 * The lists are the contract. YjsContract.test derives, with the TypeScript
 * checker, everything the package's sources use of @y/y (value imports,
 * `new`, members, destructured fields, options and event names) and fails
 * when it differs from these lists in either direction: a new use of a Yjs
 * export, field, method, option or event lands with its entry here.
 */

/**
 * The value exports of @y/y the binding uses, with their arity
 * (`Function#length`) in the supported version: a changed parameter list
 * is a changed contract.
 */
export const YJS_EXPORTS = {
  ContentAny: 1,
  ContentBinary: 1,
  ContentFormat: 2,
  ContentString: 1,
  ContentType: 1,
  Doc: 0,
  Item: 8,
  Node: 0,
  RelativePosition: 3,
  Skip: 0,
  UndoManager: 1,
  applyUpdate: 3,
  createID: 2,
  createIdSet: 0,
  createRelativePositionFromJSON: 1,
  decodeUpdate: 1,
  encodeStateAsUpdate: 2,
  findIndexSS: 2,
  findRootTypeKey: 1,
  getItemCleanStart: 2,
  iterateStructsByIdSet: 3,
  mergeUpdates: 1,
  relativePositionToJSON: 1,
} as const;

/**
 * The members (fields, getters, methods) the binding reads or calls, by the
 * name of the @y/y type that declares them. `DocOpts` and
 * `UndoManagerOptions` are constructor options the binding passes;
 * `StackItemEvent` is the payload of the undo manager's stack events;
 * `decodeUpdate` is that function's result.
 */
export const YJS_MEMBERS = {
  AbstractContent: ['getContent'],
  ContentFormat: ['key', 'value'],
  ContentString: ['str'],
  ContentType: ['type'],
  Doc: [
    '_transaction',
    '_transactionCleanups',
    'cleanupFormatting',
    'clientID',
    'destroy',
    'get',
    'off',
    'on',
    'share',
    'store',
    'transact',
  ],
  DocOpts: ['gc'],
  GC: ['id'],
  ID: ['client', 'clock'],
  IdRange: ['clock', 'len'],
  IdRanges: ['getIds'],
  IdSet: ['add', 'clients', 'hasId'],
  Item: [
    'content',
    'countable',
    'delete',
    'deleted',
    'id',
    'integrate',
    'lastId',
    'left',
    'length',
    'origin',
    'parent',
    'parentSub',
    'redone',
    'right',
    'rightOrigin',
  ],
  RelativePosition: ['assoc', 'item'],
  StackItem: ['deletes', 'inserts', 'meta'],
  StackItemEvent: ['origin', 'stackItem'],
  StructStore: ['clients', 'getClock', 'getItem'],
  Transaction: ['changed', 'deleteSet', 'doc', 'insertSet', 'origin'],
  UndoManager: [
    'canRedo',
    'canUndo',
    'clear',
    'destroy',
    'on',
    'redo',
    'redoStack',
    'undo',
    'undoStack',
  ],
  UndoManagerOptions: ['captureTimeout', 'deleteFilter', 'trackedOrigins'],
  YNode: [
    '_item',
    '_map',
    '_searchMarker',
    '_start',
    'deleteAttr',
    'doc',
    'getAttr',
    'getAttrs',
    'length',
    'name',
    'parent',
    'setAttr',
  ],
  decodeUpdate: ['ds', 'structs'],
} as const;

/** The events the binding listens to, by emitter. */
export const YJS_EVENTS = {
  Doc: ['afterAllTransactions', 'update'],
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
   * `'Item#parentSub'`, `'Item/7 (expected 8)'`, `'UndoManager@stack-cleared'`);
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
  for (const name of [...Object.keys(YJS_EXPORTS), 'GC']) {
    const value = exportsOf[name];
    const arity = (YJS_EXPORTS as Record<string, number>)[name];
    if (typeof value !== 'function') {
      found.push(name);
    } else if (arity !== undefined && value.length !== arity) {
      found.push(`${name}/${value.length} (expected ${arity})`);
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
 * and check every member of {@link YJS_MEMBERS} on one of each and every
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
    const origin = {};
    const deleteFilter = () => true;
    const trackedOrigins = new Set<unknown>([origin]);
    for (const event of YJS_EVENTS.Doc) {
      doc.on(event, () => events.add(`Doc@${event}`));
    }
    const undoManager = new y.UndoManager(root, {
      captureTimeout: 0,
      deleteFilter,
      trackedOrigins,
    });
    um.destroy = () => undoManager.destroy();
    sample('UndoManager', undoManager);
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
    }, origin);
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
    // Options are checked by what the constructor kept of them.
    if (doc.gc === false) {
      sample('DocOpts', {gc: false});
    }
    const kept = undoManager as unknown as Record<string, unknown>;
    if (
      kept.captureTimeout === 0 &&
      kept.deleteFilter === deleteFilter &&
      kept.trackedOrigins === trackedOrigins
    ) {
      sample('UndoManagerOptions', {
        captureTimeout: 0,
        deleteFilter,
        trackedOrigins,
      });
    }
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
  for (const [kind, members] of Object.entries(YJS_MEMBERS)) {
    const value = samples.get(kind);
    if (value === undefined && threw !== null) {
      continue;
    }
    for (const member of members) {
      if (value === undefined || !(member in value)) {
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
