/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {registerNodeStructure} from '@lexical/extension';
import {
  applyUpdate,
  ContentFormat,
  ContentString,
  ContentType,
  createRelativePositionFromJSON,
  Doc,
  encodeStateAsUpdate,
  findIndexSS,
  findRootTypeKey,
  Item,
  iterateStructsByIdSet,
  Node as YNode,
  RelativePosition,
  relativePositionToJSON,
  type Transaction,
  UndoManager,
} from '@y/y';
import {
  $createParagraphNode,
  $createRangeSelection,
  $getNodeByKey,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  $isRootNode,
  $isTextNode,
  $needsNodeStructureNormalization,
  $normalizeNodeStructure,
  $setSelection,
  COLLABORATION_TAG,
  type EditorState,
  type ElementNode,
  getActiveElement,
  HISTORY_MERGE_TAG,
  type Klass,
  type LexicalEditor,
  type LexicalNode,
  LexicalWarning,
  type NodeKey,
  type PointType,
  type RangeSelection,
  SKIP_COLLAB_TAG,
  SKIP_COMPOSITION_MERGE_TAG,
  SKIP_DOM_SELECTION_TAG,
} from 'lexical';

import {type ClientIDRange, constrainClientID} from './ClientID';
import {DEFAULT_ROOT_NAME, LEGACY_ROOTS} from './constants';
import {Hidden, shownLength} from './Hidden';
import {isDeleted, Reader} from './Read';
import {
  findListMerges,
  PAD_KEY,
  type Repair,
  REPAIR_VERSION,
  tableRepair,
  tablesOf,
} from './Repair';
import {
  $groupFields,
  $isWrapper,
  canStoreAs,
  deriveStorageKind,
  FIELD_PREFIX,
  getContainerGroupSpec,
  getGroupSpec,
  identityOf,
  klassOf,
  LAYOUT_KEY,
  LAYOUT_VERSION,
  MARKER,
  type Pin,
  PIN_PREFIX,
  RUN_END,
  stableStringify,
  storageKindOf,
  withPins,
} from './Schema';
import {$checkWrite, checkContainer} from './SelfCheck';
import {
  type CS,
  isEndItem,
  nameOf,
  prevLiveEnd,
  Roles,
  State,
  typeOf,
} from './State';
import {
  RECOVERED_READ_WARNING,
  RECOVERED_WRITE_WARNING,
  SELF_CHECK_WARNING,
  STORAGE_MISMATCH_WARNING,
  takeNotes,
  UNKNOWN_NODE_TYPES_WARNING,
  UNSUPPORTED_LAYOUT_WARNING,
  type YBindingWarningCode,
} from './Warnings';
import {$holdsLines, type WritePlan, Writer} from './Write';

export {DEFAULT_ROOT_NAME};

// A collaborator's change: SKIP_COMPOSITION_MERGE_TAG keeps Lexical from
// merging text into an active IME composition (the composed DOM text node
// would take in the merged text).
const REMOTE_TAGS = [
  COLLABORATION_TAG,
  HISTORY_MERGE_TAG,
  SKIP_COMPOSITION_MERGE_TAG,
];
const REFRESH_TAG = 'lexical-y-refresh';
const REPAIR_TAG = 'lexical-y-repair';

/** @experimental The state of a {@link YBinding}. */
export type YBindingStatus =
  /** Waiting for the first sync: nothing is written. */
  | 'pending'
  /** Reading and writing. */
  | 'active'
  /** The document uses a layout this version cannot write: read only. */
  | 'readonly';

/** @experimental Options of {@link YBinding} (and `YCollabExtension`). */
export interface YBindingOptions {
  /** The shared root to bind; defaults to `doc.get('lexical-y')`. */
  root?: YNode;
  /** Undo capture timeout in ms (default 500); null disables undo. */
  captureTimeout?: number | null;
  /** Called when `status` changes. */
  onStatus?: (status: YBindingStatus) => void;
  /**
   * Read every line a local write touched back from Yjs and compare it with
   * the editor; mismatches are reported to the editor's `onWarn` as a
   * `LexicalWarning` (code `'@lexical/y/self-check'`).
   * Structural changes (and remote changes) also compare a fresh read of
   * the whole container: every time for containers of up to 256 lines and
   * nodes, and with probability 256 / size for bigger ones, so the expected
   * cost of an edit stays bounded. Default: off. A debugging aid: turn it
   * on in tests and development builds to catch binding bugs.
   */
  selfCheck?: boolean;
  /** Fraction of local writes the self-check samples (default 1). */
  selfCheckSample?: number;
  /**
   * Initialize even when an older layout's root has content: for a
   * converter writing the layout root of an existing document.
   */
  convert?: boolean;
  /**
   * The range of the document's client ids: `'uint53'` (default, Yjs 14's
   * ids, left as they are) or `'uint32'` (kept in 32 bits, for servers on
   * yrs before 0.28; see {@link ClientIDRange}).
   */
  clientIDRange?: ClientIDRange;
}

/**
 * @experimental A selection as Yjs relative positions, from
 * `YBinding#getCursor` (for an awareness-based cursor UI).
 */
export interface YCursor {
  anchor: unknown;
  focus: unknown;
}

/**
 * @experimental A Yjs 14 binding for one editor and one shared root.
 *
 * Every container (the root, and every node stored as its own Y.Node) holds
 * one sequence of text, child nodes and line markers; see the package README
 * for the layout.
 *
 * Warnings (read only states, recoveries, the opt-in self-check) go to the
 * editor's `onWarn` as `LexicalWarning`s with `@lexical/y/...` codes (see
 * `UNSUPPORTED_LAYOUT_WARNING` and the other `*_WARNING` constants), once a
 * remote change has been applied in full: never from inside a Yjs observer
 * or transaction. A handler that throws does not affect syncing.
 */
export class YBinding {
  private readonly _editor: LexicalEditor;
  private readonly _doc: Doc;
  private readonly _root: YNode;
  private _status: YBindingStatus = 'pending';
  private readonly _pins = new Map<string, Pin>();
  private _undoManager: UndoManager | null = null;
  private state: State;
  private readonly options: YBindingOptions;
  private disposers: (() => void)[] = [];
  /** Origin of the initialization transaction (not tracked by undo). */
  private readonly initOrigin = {binding: this};
  /** Origin of repairs of remote changes (not tracked by undo). */
  private readonly repairOrigin = {binding: this, repair: true};
  /** Repairs written from the shared content: read back like remote changes. */
  private readonly sharedRepairOrigin = {binding: this, sharedRepair: true};
  private readonly repairQueue = new Set<YNode>();
  /** Set while a normalization of remote content is written (see normalizeShared). */
  private normalizeWrite = false;
  private readonly normalizeQueue = new Set<YNode>();
  private normalizing = false;
  private normalizeScheduled = false;
  /** The real client id while a derived one is in use (see transactAs). */
  private restoreClientID: number | null = null;
  /** Counts remote transactions (a local write's self-check is skipped when one landed during it). */
  private remoteSeq = 0;
  private repairing = false;
  /** Origin of read-only scans (no changes). */
  private readonly scanOrigin = {binding: this, scan: true};
  /** Stored nodes the running undo/redo restores (see isKeptByUndo). */
  private restoring: Set<string> | null = null;
  /** Stored nodes the running undo/redo deletes (it inserted them). */
  private removing: Set<Item> | null = null;
  private wasEditable = true;
  private undoCache = new WeakMap<YNode, Set<number>>();
  private readonly afterTransaction: (tr: Transaction) => void;
  private readonly beforeTransaction: (tr: Transaction) => void;
  private readonly beforeObserverCalls = (tr: Transaction): void => {
    // A transaction under a derived client id has written its items: the
    // real id is back before anything observes it (see transactAs).
    this.restoreRealClientID();
    tr.changed.forEach((_subs, type) => {
      if (this.state.containers.has(type)) {
        type._hasFormatting = false;
      }
    });
  };
  /** The local selection before the remote transaction being applied. */
  private pendingCursor: YCursor | null = null;
  /** Node transforms the binding registers (not run by flushRefresh). */
  private readonly ownTransforms = new Set<(node: LexicalNode) => void>();
  /** Warnings not passed to the editor's onWarn yet (see flushWarnings). */
  private readonly pendingWarnings: LexicalWarning[] = [];
  /** Depth of the binding's own work in progress (see guard). */
  private busy = 0;
  private flushingWarnings = false;
  private readonly afterAllTransactions = (): void => this.flushWarnings();

  /** The bound editor. */
  get editor(): LexicalEditor {
    return this._editor;
  }

  /** The shared document. */
  get doc(): Doc {
    return this._doc;
  }

  /** The shared root this binding reads and writes. */
  get root(): YNode {
    return this._root;
  }

  /** See {@link YBindingStatus}; `onStatus` reports changes. */
  get status(): YBindingStatus {
    return this._status;
  }

  /** Storage kinds the document records per node type (see the README). */
  get pins(): ReadonlyMap<string, Pin> {
    return this._pins;
  }

  /** The collaborative undo manager; null when undo is disabled. */
  get undoManager(): UndoManager | null {
    return this._undoManager;
  }

  constructor(editor: LexicalEditor, doc: Doc, options: YBindingOptions = {}) {
    this._editor = editor;
    this._doc = doc;
    this.options = options;
    this._root = options.root || doc.get(DEFAULT_ROOT_NAME);
    this.state = new State(editor, doc, this._root);
    this.afterTransaction = tr =>
      this.guard(() => withPins(this._pins, () => this.onAfterTransaction(tr)));
    this.beforeTransaction = tr => {
      this.pendingCursor =
        this._status !== 'pending' &&
        tr.origin !== this &&
        tr.origin !== this.initOrigin &&
        tr.origin !== this.repairOrigin &&
        tr.origin !== this.sharedRepairOrigin
          ? this.getCursor()
          : null;
    };
  }

  /** Start listening; read the document if it is already initialized. */
  start(): () => void {
    return this.guard(() => this.startInner());
  }

  private startInner(): () => void {
    if (this.options.clientIDRange === 'uint32') {
      this.disposers.push(constrainClientID(this._doc));
    }
    // Lexical records explicit node moves (read by the writer, which then
    // rewrites what moved rather than what it passed).
    const recordedMoves = this._editor._recordNodeMoves;
    this._editor._recordNodeMoves = true;
    this.disposers.push(() => {
      this._editor._recordNodeMoves = recordedMoves;
    });
    // Fail closed: not editable until the layout record has been read.
    this.wasEditable = this._editor.isEditable();
    this._editor.setEditable(false);
    // Yjs cleans up formats after a remote transaction by rescanning every
    // type that has formats (whole containers here, so O(document) per remote
    // bold). The binding writes no redundant formats itself (the writer
    // cleans its own gaps), so its containers opt out: they are marked as
    // having no formats before Yjs decides whether to clean up. The
    // document's flag and the app's other types are left alone.
    this._doc.on('beforeObserverCalls', this.beforeObserverCalls);
    this.disposers.push(() =>
      this._doc.off('beforeObserverCalls', this.beforeObserverCalls),
    );
    this._doc.on('beforeTransaction', this.beforeTransaction);
    this.disposers.push(() =>
      this._doc.off('beforeTransaction', this.beforeTransaction),
    );
    this._doc.on('afterTransaction', this.afterTransaction);
    this.disposers.push(() =>
      this._doc.off('afterTransaction', this.afterTransaction),
    );
    // Warnings found while Yjs applies a change are passed on once it has
    // been applied in full (see flushWarnings).
    this._doc.on('afterAllTransactions', this.afterAllTransactions);
    this.disposers.push(() =>
      this._doc.off('afterAllTransactions', this.afterAllTransactions),
    );
    this.disposers.push(
      this._editor.registerUpdateListener(payload =>
        this.guard(() => {
          withPins(this._pins, () => this.onUpdate(payload));
          if (
            this.state.hidden !== null &&
            this._editor._compositionKey === null
          ) {
            withPins(this._pins, () => this.flushHidden());
          }
          // Repairs held back while composing (or behind a pending update).
          if (this.repairQueue.size > 0 && !this.repairing) {
            withPins(this._pins, () => this.runRepairs([]));
          }
          if (this.normalizeQueue.size > 0 && !this.normalizing) {
            withPins(this._pins, () => this.normalizeShared([]));
          }
        }),
      ),
    );
    // Every peer must hold the normalized tree its declarations describe
    // (children, mergeAdjacent), as NodeStructureExtension enforces it.
    this.disposers.push(registerNodeStructure(this._editor));
    const canonicalize = (node: LexicalNode) =>
      withPins(this._pins, () => $canonicalizeGroup(node as ElementNode));
    this.ownTransforms.add(canonicalize);
    for (const {klass} of this._editor._nodes.values()) {
      const spec = getGroupSpec(klass);
      if (spec !== null && spec.klass === klass) {
        this.disposers.push(
          this._editor.registerNodeTransform(klass, canonicalize),
        );
      }
    }
    if (this.options.captureTimeout !== null) {
      const um = new UndoManager(this._root, {
        captureTimeout: this.options.captureTimeout ?? 500,
        deleteFilter: item => !this.isKeptByUndo(item),
        trackedOrigins: new Set([this]),
      });
      this._undoManager = um;
      this.disposers.push(() => um.destroy());
    }
    this.evaluate();
    return () => this.dispose();
  }

  dispose(): void {
    for (const d of this.disposers.splice(0)) {
      d();
    }
    // A pending or read-only binding made the editor non-editable: give it
    // back as it was before the binding.
    if (this._status !== 'active') {
      this._editor.setEditable(this.wasEditable);
    }
    this.state.clear();
    this._undoManager = null;
    this.flushWarnings();
  }

  /**
   * Call after the provider's first sync. An empty root is marked with this
   * layout and gets the editor's current content, unless an older layout's
   * root (`root`, `root-v2`) has content: such a document is read only, and
   * must be converted instead (a binding with `convert: true` writes the
   * layout root next to the old one). Anything else is read.
   *
   * The initial content is written with a client id derived from the layout
   * version and the content itself, so that two clients initializing the same
   * document with the same content at once write the same items (one copy),
   * and is not part of the undo history.
   */
  initialize(): void {
    this.guard(() => withPins(this._pins, () => this.initializeInner()));
  }

  private initializeInner(): void {
    if (this._status !== 'pending') {
      return;
    }
    if (
      this._root.length === 0 &&
      this._root.getAttr(LAYOUT_KEY) === undefined
    ) {
      const legacy = this.options.convert ? [] : this.legacyRootsWithContent();
      if (legacy.length > 0) {
        this.warn(
          UNSUPPORTED_LAYOUT_WARNING,
          `@lexical/y: the document has content in ${legacy.join(', ')} (an older layout); convert it to this layout instead of initializing it.`,
          {layout: undefined, legacyRoots: legacy},
        );
        this.setStatus('readonly');
        return;
      }
      const editorState = this._editor.getEditorState();
      this.transactAs(
        this.initClientIDFor(editorState),
        tr => {
          this.$writeInitial(this.state, this._root, tr, editorState);
        },
        this.initOrigin,
      );
      this.loadPins();
      this.setStatus('active');
      return;
    }
    this.evaluate();
  }

  /** Write the layout record and the editor's content into an empty root. */
  private $writeInitial(
    state: State,
    root: YNode,
    tr: Transaction,
    editorState: EditorState,
  ): void {
    root.setAttr(LAYOUT_KEY, LAYOUT_VERSION);
    // Every element type of the initial content (into `root`, which may be
    // a scratch document's: this._pins is filled when the real one is read).
    this.recordPins(root, editorState, null, new Map());
    editorState.read(() => {
      const roles = new Roles(state);
      const cs = state.newCS(root, 'root', 'b');
      const writer = new Writer(state, roles, tr, editorState, {
        attrs: new Set(),
        inline: new Set(),
        lines: new Set(),
        removedText: new Map(),
        structural: new Set(['root']),
      });
      writer.$writeContainer(cs, $getRoot());
    });
  }

  /**
   * The init transaction's client id: a hash of which shared type is being
   * initialized (its top-level name, or its item id when nested) and of the
   * exact items the initialization writes (encoded from a scratch document
   * with a fixed client id), so two clients share an id only when they would
   * write the same items into the same type.
   */
  private clientIDRange(): ClientIDRange {
    return this.options.clientIDRange === 'uint32' ? 'uint32' : 'uint53';
  }

  private initClientIDFor(editorState: EditorState): number {
    let target: string;
    const item = this._root._item;
    if (item !== null) {
      target = `i:${item.id.client}:${item.id.clock}`;
    } else {
      target = 'r:';
      this._doc.share.forEach((type, name) => {
        if (type === this._root) {
          target = 'r:' + name;
        }
      });
    }
    const scratch = new Doc({gc: false});
    scratch.clientID = 1;
    const sroot = scratch.get('init');
    const sstate = new State(this._editor, scratch, sroot);
    scratch.transact(tr => this.$writeInitial(sstate, sroot, tr, editorState));
    const bytes = encodeStateAsUpdate(scratch);
    scratch.destroy();
    let content = '';
    for (let i = 0; i < bytes.length; i += 4096) {
      content += String.fromCharCode.apply(
        null,
        Array.from(bytes.subarray(i, i + 4096)),
      );
    }
    return initClientID(
      LAYOUT_VERSION + '\u0000' + target + '\u0000' + content,
      this.clientIDRange(),
    );
  }

  /** Older layouts' roots that hold content. */
  private legacyRootsWithContent(): string[] {
    const out: string[] = [];
    for (const name of LEGACY_ROOTS) {
      const type = this._doc.share.get(name);
      if (type === undefined) {
        continue;
      }
      let content = type._map.size > 0;
      for (let it = type._start; it !== null && !content; it = it.right) {
        if (!it.deleted) {
          content = true;
        }
      }
      if (content) {
        out.push(name);
      }
    }
    return out;
  }

  /**
   * Read the kinds the document records per type. A registered class whose
   * own derivation differs uses the recorded kind when it can be stored that
   * way; otherwise the document is read only (returns false).
   */
  private loadPins(): boolean {
    this._pins.clear();
    const attrs = this._root.getAttrs() as Record<string, unknown>;
    for (const key of Object.keys(attrs)) {
      const v = attrs[key];
      if (key.startsWith(PIN_PREFIX) && typeof v === 'string') {
        // `kind` or `kind|field,field` (a group's or format's identity).
        const [kind, by] = v.split('|');
        this._pins.set(key.slice(PIN_PREFIX.length), {
          by: by === undefined ? undefined : by.split(','),
          kind: kind as Pin['kind'],
        });
      }
    }
    const conflicts: string[] = [];
    const conflicting: string[] = [];
    for (const [type, pin] of this._pins) {
      const info = this._editor._nodes.get(type);
      if (info === undefined) {
        continue;
      }
      const derived = deriveStorageKind(info.klass);
      const by = identityOf(info.klass);
      if (pin.kind !== derived && !canStoreAs(info.klass, pin.kind)) {
        conflicting.push(type);
        conflicts.push(
          `${type} (document: ${pin.kind}, this editor: ${derived})`,
        );
      } else if (
        (pin.kind === 'group' || pin.kind === 'format') &&
        pin.by !== undefined &&
        pin.kind === derived &&
        JSON.stringify(pin.by) !== JSON.stringify(by)
      ) {
        conflicting.push(type);
        conflicts.push(
          `${type} (document identity: ${pin.by.join(',')}, this editor: ${by.join(',')})`,
        );
      }
    }
    if (conflicts.length > 0) {
      this.warn(
        STORAGE_MISMATCH_WARNING,
        `@lexical/y: the document stores node types in a way this editor cannot (${conflicts.join('; ')}); it is read only.`,
        {types: conflicting},
      );
      this.setStatus('readonly');
      return false;
    }
    return true;
  }

  /** Record the kind of every element type written for the first time. */
  private recordPins(
    root: YNode,
    editorState: EditorState,
    keys: readonly NodeKey[] | null,
    pins: Map<string, Pin> = this._pins,
  ): void {
    const nodeMap = editorState._nodeMap;
    const seen = new Set<string>();
    const visit = (node: LexicalNode | undefined) => {
      if (node === undefined || !$isElementNode(node) || $isRootNode(node)) {
        return;
      }
      const type = node.getType();
      if (seen.has(type) || pins.has(type)) {
        return;
      }
      seen.add(type);
      const klass = node.constructor as Klass<LexicalNode>;
      const kind = storageKindOf(klass);
      const pin: Pin =
        kind === 'group' || kind === 'format'
          ? {by: identityOf(klass), kind}
          : {kind};
      pins.set(type, pin);
      root.setAttr(
        PIN_PREFIX + type,
        pin.by === undefined ? kind : kind + '|' + pin.by.join(','),
      );
    };
    withPins(this._pins, () => {
      if (keys === null) {
        for (const node of nodeMap.values()) {
          visit(node);
        }
      } else {
        for (const key of keys) {
          visit(nodeMap.get(key));
        }
      }
    });
  }

  private evaluate(): void {
    if (!this.loadPins()) {
      this.readAll();
      return;
    }
    const version = this._root.getAttr(LAYOUT_KEY);
    if (version === undefined) {
      if (this._root.length > 0) {
        this.warn(
          UNSUPPORTED_LAYOUT_WARNING,
          '@lexical/y: the shared root has content but no layout version; it is read only.',
          {layout: undefined, legacyRoots: []},
        );
        this.setStatus('readonly');
        this.readAll();
      }
      return;
    }
    if (
      typeof version !== 'number' ||
      !Number.isInteger(version) ||
      version < 1 ||
      version > LAYOUT_VERSION
    ) {
      this.warn(
        UNSUPPORTED_LAYOUT_WARNING,
        `@lexical/y: the document uses layout ${String(version)}, not one this version supports (1 to ${LAYOUT_VERSION}); it is read only.`,
        {layout: version, legacyRoots: []},
      );
      this.setStatus('readonly');
    } else {
      this.setStatus('active');
    }
    this.readAll();
  }

  /** Self-check of containers a remote change rebuilt (see checkContainer). */
  private checkRead(rebuilt: ReadonlySet<CS>): void {
    const check = this.options.selfCheck === true;
    if (
      !check ||
      rebuilt.size === 0 ||
      Math.random() >= (this.options.selfCheckSample ?? 1)
    ) {
      return;
    }
    const editorState = this._editor.getEditorState();
    const problems: string[] = [];
    const wrong: CS[] = [];
    for (const cs of rebuilt) {
      if (sampleWholeContainer(cs)) {
        const found = checkContainer(this.state, cs, editorState);
        if (found.length > 0) {
          wrong.push(cs);
          // A line holding lines (written without the normalization, which
          // has not run yet) is stored as the lines the normalization
          // leaves (see Writer#$pushLine): the editor differs from the
          // shared content there until it runs. The read below brings it in
          // line, which is no reader bug.
          if (!editorState.read(() => this.$holdsWrittenLines(cs))) {
            problems.push(...found);
          }
        }
      }
    }
    if (problems.length > 0) {
      this.warn(
        SELF_CHECK_WARNING,
        '@lexical/y self-check (remote): ' + problems.slice(0, 5).join('; '),
        {problems, remote: true},
      );
    }
    if (wrong.length > 0) {
      // After a remote change the shared content is right and the editor is
      // wrong (a reader bug): read those containers again in full, which
      // moves this client to what every fresh reader shows.
      this.rereadContainers(wrong);
    }
  }

  /**
   * Whether the editor's element of container `cs` holds a line that holds
   * lines (see Writer#$pushLine), among the nodes stored in `cs` itself.
   */
  private $holdsWrittenLines(cs: CS): boolean {
    const el = cs.y === this._root ? $getRoot() : $getNodeByKey(cs.key);
    if (!$isElementNode(el) || !el.isAttached()) {
      return false;
    }
    const roles = new Roles(this.state);
    const visit = (n: ElementNode): boolean => {
      for (const c of n.getChildren()) {
        if (!$isElementNode(c)) {
          continue;
        }
        const role = roles.$role(c);
        if (role === 'line' && $holdsLines(roles, c)) {
          return true;
        }
        if ((role === 'group' || role === 'level') && visit(c)) {
          return true;
        }
      }
      return false;
    };
    return visit(el);
  }

  private rereadContainers(list: CS[]): void {
    let error: unknown = null;
    this._editor.update(
      () => {
        try {
          const reader = new Reader(this.state);
          for (const cs of list) {
            const el = cs.y === this._root ? $getRoot() : $getNodeByKey(cs.key);
            if ($isElementNode(el) && el.isAttached()) {
              reader.$readFull(cs, el);
            }
          }
        } catch (e) {
          error = e;
        }
      },
      {
        discrete: true,
        skipTransforms: true,
        tag: REMOTE_TAGS,
      },
    );
    if (error !== null) {
      this.recoverRead(error);
    }
  }

  /** Fail closed when a read found node types this editor lacks. */
  private checkUnknownTypes(): void {
    const unknown = this.state.unknownTypes;
    if (unknown.size > 0 && this._status === 'active') {
      const types = [...unknown].sort();
      this.warn(
        UNKNOWN_NODE_TYPES_WARNING,
        `@lexical/y: the document has node types this editor does not register (${types.join(
          ', ',
        )}); it is read only, so that content is not hidden and then deleted.`,
        {types},
      );
      this.setStatus('readonly');
    }
  }

  private setStatus(status: YBindingStatus): void {
    const changed = this._status !== status;
    this._status = status;
    if (changed && this.options.onStatus) {
      this.options.onStatus(status);
    }
    this._editor.setEditable(status === 'active' && this.wasEditable);
  }

  /**
   * Report a warning to the editor's `onWarn`, as a `LexicalWarning`. It is
   * queued and passed on once the binding's work is done and Yjs is idle:
   * never inside a Yjs observer or transaction, and never half way through
   * a read or a write (see flushWarnings).
   */
  private warn(
    code: YBindingWarningCode,
    message: string,
    data: unknown,
  ): void {
    this.pendingWarnings.push(new LexicalWarning(code, message, data));
  }

  /** Run the binding's own work; queued warnings are passed on after it. */
  private guard<T>(fn: () => T): T {
    this.busy++;
    try {
      return fn();
    } finally {
      this.busy--;
      this.flushWarnings();
    }
  }

  /**
   * Pass the queued warnings to the editor's `onWarn`, when nothing is in
   * progress: no work of the binding's (see guard) and no Yjs transaction
   * (the change has been applied, observers included; afterAllTransactions
   * calls this again). A handler that throws does not stop the others or
   * the binding, which is consistent by then: its error is rethrown in a
   * microtask (an uncaught error, as Lexical's default `onWarn` throws in
   * development), never into Yjs or a provider.
   */
  private flushWarnings(): void {
    // Warnings about classes and values (see noteOnce), found while this
    // binding read or wrote.
    for (const note of takeNotes()) {
      this.warn(note.code, note.message, note.data);
    }
    const doc = this._doc;
    if (
      this.flushingWarnings ||
      this.busy > 0 ||
      this.pendingWarnings.length === 0 ||
      doc._transaction !== null ||
      doc._transactionCleanups.length > 0
    ) {
      return;
    }
    this.flushingWarnings = true;
    try {
      for (
        let warning = this.pendingWarnings.shift();
        warning !== undefined;
        warning = this.pendingWarnings.shift()
      ) {
        try {
          this._editor._onWarn(warning);
        } catch (error) {
          queueMicrotask(() => {
            throw error;
          });
        }
      }
    } finally {
      this.flushingWarnings = false;
    }
  }

  private readAll(): void {
    this._editor.update(
      () => {
        const reader = new Reader(this.state);
        let cs = this.state.containers.get(this._root);
        if (cs === undefined) {
          cs = this.state.newCS(this._root, 'root', 'b');
        }
        reader.$readFull(cs, $getRoot());
        $setSelection(null);
      },
      {
        discrete: true,
        skipTransforms: true,
        tag: REMOTE_TAGS,
      },
    );
    this.checkUnknownTypes();
    this.flushRefresh(true);
  }

  // -------------------------------------------------------------------------
  // Remote -> Lexical

  private onAfterTransaction(tr: Transaction): void {
    if (
      tr.origin === this ||
      tr.origin === this.initOrigin ||
      tr.origin === this.repairOrigin ||
      tr.origin === this.scanOrigin
    ) {
      return;
    }
    this.remoteSeq++;
    if (this._status === 'pending') {
      if (this._root.getAttr(LAYOUT_KEY) !== undefined) {
        this.evaluate();
      }
      return;
    }
    const state = this.state;
    const childItems = new Map<YNode, Item[]>();
    const add = (s: unknown) => {
      if (
        s instanceof Item &&
        s.parentSub === null &&
        s.parent instanceof YNode
      ) {
        if (!state.containers.has(s.parent)) {
          return;
        }
        let list = childItems.get(s.parent);
        if (list === undefined) {
          list = [];
          childItems.set(s.parent, list);
        }
        list.push(s);
      }
    };
    iterateStructsByIdSet(tr, tr.insertSet, add);
    iterateStructsByIdSet(tr, tr.deleteSet, add);
    const attrKeys = new Map<YNode, Set<string>>();
    tr.changed.forEach((subs, type) => {
      const keys = new Set<string>();
      subs.forEach(k => {
        if (k !== null) {
          keys.add(k);
        }
      });
      if (keys.size === 0) {
        return;
      }
      if (type === this._root) {
        if (keys.has(LAYOUT_KEY)) {
          this.evaluate();
        } else if ([...keys].some(k => k.startsWith(PIN_PREFIX))) {
          this.loadPins();
        }
        return;
      }
      const isOurs =
        state.keyByY.has(type) ||
        (type.name === MARKER &&
          type._item !== null &&
          state.unitByEnd.has(type._item));
      if (isOurs) {
        attrKeys.set(type, keys);
      }
    });
    if (childItems.size === 0 && attrKeys.size === 0) {
      return;
    }
    // A local update still pending (an editor.update() in the same task,
    // e.g. from an app's observer of another shared type) is committed and
    // written first: the remote read must not absorb it untagged-as-local.
    if (this._editor._pendingEditorState !== null) {
      this._editor.update(() => {}, {discrete: true});
    }
    const cursor = this.pendingCursor;
    this.pendingCursor = null;
    const changedKeys: NodeKey[] = [];
    let rebuilt: ReadonlySet<CS> = new Set();
    let readError: unknown = null;
    this._editor.update(
      () => {
        try {
          this.$readRemote(
            state,
            childItems,
            attrKeys,
            cursor,
            changedKeys,
            r => {
              rebuilt = r;
            },
          );
        } catch (e) {
          readError = e;
        }
      },
      {
        discrete: true,
        skipTransforms: true,
        tag: REMOTE_TAGS,
      },
    );
    if (readError !== null) {
      this.recoverRead(readError);
      return;
    }
    this.checkUnknownTypes();
    this.checkRead(rebuilt);
    this.flushRefresh(true);
    if (childItems.size > 0) {
      this.runRepairs([...childItems.keys()]);
    }
    if (childItems.size > 0 || attrKeys.size > 0 || rebuilt.size > 0) {
      const ys = new Set([
        ...childItems.keys(),
        ...[...rebuilt].map(cs => cs.y),
      ]);
      // An attribute change (an isInline() flip, a list type change) can make
      // the container holding the node un-normalized.
      for (const y of attrKeys.keys()) {
        const parent = y._item === null ? null : y._item.parent;
        if (parent instanceof YNode) {
          ys.add(parent);
        }
      }
      this.normalizeShared(ys);
    }
  }

  /** Whether any of `ys` holds content normalizeShared would change. */
  private $hasUnnormalized(ys: Iterable<YNode>): boolean {
    for (const y of ys) {
      const cs = this.state.containers.get(y);
      const el =
        cs === undefined
          ? null
          : y === this._root
            ? $getRoot()
            : $getNodeByKey(cs.key);
      if (!$isElementNode(el) || !el.isAttached()) {
        continue;
      }
      if (this.$findUnnormalized(el, () => true)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Calls `found` with every element of the container element `el` that
   * normalizeShared would change: `el` and its descendants stored in the
   * same container (lines, groups and their items, inline elements of
   * lines), including the nodes stored as their own containers but not what
   * those contain. Stops when `found` returns true; returns whether it did.
   */
  private $findUnnormalized(
    el: ElementNode,
    found: (n: ElementNode) => boolean,
  ): boolean {
    const visit = (n: LexicalNode, top: boolean): boolean => {
      if (!$isElementNode(n)) {
        return false;
      }
      const stored = this.state.yByKey.has(n.getKey());
      if ($needsRemoteNormalization(n, stored) && found(n)) {
        return true;
      }
      if (!top && (stored || n.isShadowRoot())) {
        return false;
      }
      for (const c of n.getChildren()) {
        if (visit(c, false)) {
          return true;
        }
      }
      return false;
    };
    return el.isAttached() && visit(el, true);
  }

  /**
   * The client id a normalization's write uses: a hash of exactly what it
   * writes, found by running the same write on a copy of the document and
   * describing it independently of the writing client (every inserted item's
   * content, parent and neighbours, by id). Peers that
   * would write the same items derive the same id, so Yjs keeps one copy;
   * peers that would write anything else derive another. Null when the dry
   * run fails (the write then uses the real client id).
   */
  private $normalizeClientID(
    prevEditorState: EditorState,
    plan: WritePlan,
  ): number | null {
    const fork = new Doc({gc: false});
    try {
      applyUpdate(fork, encodeStateAsUpdate(this._doc));
      const root =
        this._root._item === null
          ? (fork.get(findRootTypeKey(this._root)) as YNode)
          : ((itemById(fork, this._root._item.id).content as ContentType)
              .type as YNode);
      const state = this.state.fork(fork, root);
      state.segmentPrefix = '@';
      // A client the copy has never seen.
      let client = 1;
      while (fork.store.clients.has(client)) {
        client++;
      }
      fork.clientID = client;
      let description = '';
      fork.transact(tr => {
        new Writer(state, new Roles(state), tr, prevEditorState, {
          ...plan,
          attrs: new Set(plan.attrs),
          inline: new Set(plan.inline),
          lines: new Set(plan.lines),
          removedText: new Map(plan.removedText),
          structural: new Set(plan.structural),
        }).$run();
        description = describeWrite(tr, client);
      });
      return initClientID(
        'normalize\u0000' +
          REPAIR_VERSION +
          '\u0000' +
          LAYOUT_VERSION +
          '\u0000' +
          description,
        this.clientIDRange(),
      );
    } catch (_e) {
      return null;
    } finally {
      fork.destroy();
    }
  }

  /**
   * After a change (remote, or local and written without transforms),
   * normalize what it left un-normalized: content a client wrote without the
   * normalization (an update with skipTransforms, an older client) or that
   * concurrent edits produced (text typed into a paragraph a peer removed
   * from a table cell). Lexical's normalization
   * (NodeStructureExtension) runs on the changed containers right after the
   * read, and its result is written under a client id derived from the
   * containers' full shared content (every item and attribute, deleted or
   * not, by id) and from the normalized result. Every peer that read the
   * same content computes the same result and writes the same items under
   * the same id, so Yjs keeps one copy: concurrent repairs neither duplicate
   * what they move nor lose it. A peer whose content differs (it has not
   * received everything yet) derives another id, so different repairs never
   * share one. Merges of adjacent equal groups (lists) are left to the
   * shared repairs (see runRepairs), which already merge them on every peer.
   * Waits while the editor is composing or has a pending update, and is not
   * part of the undo history.
   */
  private normalizeShared(ys: Iterable<YNode>): void {
    for (const y of ys) {
      this.normalizeQueue.add(y);
    }
    if (
      this.normalizing ||
      this.repairing ||
      this._status !== 'active' ||
      this._editor._compositionKey !== null ||
      this._editor._pendingEditorState !== null ||
      this.state.hidden !== null
    ) {
      return;
    }
    if (this._editor._updating || this._editor._updates.length > 0) {
      // Inside an update (an update listener, a provider delivering from
      // one): the normalization's update would be queued, and could be
      // batched with other changes, which must not be written under the
      // repair's client id. It runs once the editor is idle.
      if (!this.normalizeScheduled) {
        this.normalizeScheduled = true;
        queueMicrotask(() => {
          this.normalizeScheduled = false;
          if (this.normalizeQueue.size > 0 && this.disposers.length > 0) {
            withPins(this._pins, () => this.normalizeShared([]));
          }
        });
      }
      return;
    }
    let queued = [...this.normalizeQueue];
    this.normalizeQueue.clear();
    // One repair per write, in document order: each is identified by what
    // it alone writes, so peers that see the same violations at different
    // times (one repaired by a peer already, another not) still write each
    // repair the same way.
    const tried = new Set<NodeKey>();
    this.normalizing = true;
    try {
      for (let guard = 0; guard < 256; guard++) {
        queued = [...new Set([...queued, ...this.normalizeQueue])].filter(
          y => !isDeleted(y),
        );
        this.normalizeQueue.clear();
        let target: NodeKey | null = null;
        this._editor.getEditorState().read(() => {
          for (const y of queued) {
            const cs = this.state.containers.get(y);
            const el =
              cs === undefined
                ? null
                : y === this._root
                  ? $getRoot()
                  : $getNodeByKey(cs.key);
            if (
              $isElementNode(el) &&
              el.isAttached() &&
              this.$findUnnormalized(el, n => {
                if (tried.has(n.getKey())) {
                  return false;
                }
                target = n.getKey();
                return true;
              })
            ) {
              return;
            }
          }
        });
        if (target === null) {
          return;
        }
        const key: NodeKey = target;
        tried.add(key);
        this.normalizeWrite = true;
        try {
          this._editor.update(
            () => {
              const node = $getNodeByKey(key);
              if ($isElementNode(node) && node.isAttached()) {
                // Dirty, so that the class's own transforms run too.
                node.markDirty();
                $normalizeRemote(node, this.state.yByKey.has(key));
              }
            },
            {discrete: true, tag: [REPAIR_TAG, HISTORY_MERGE_TAG]},
          );
        } finally {
          this.normalizeWrite = false;
        }
      }
    } finally {
      this.normalizing = false;
    }
  }

  private $readRemote(
    state: State,
    childItems: Map<YNode, Item[]>,
    attrKeys: Map<YNode, Set<string>>,
    cursor: YCursor | null,
    changedKeys: NodeKey[],
    setRebuilt: (rebuilt: ReadonlySet<CS>) => void,
  ): void {
    const reader = new Reader(state);
    setRebuilt(reader.rebuilt);
    const composing = this.$composingOwner();
    reader.composingKey = composing;
    reader.$apply(childItems, attrKeys);
    // Remote inserts into the line being composed are shown when the
    // composition ends (see Hidden).
    let hidden = state.hidden;
    if (
      hidden !== null &&
      (reader.composingRead || hidden.ownerKey !== composing)
    ) {
      if (!reader.composingRead) {
        state.hidden = null;
        reader.$refreshComposed(hidden.ownerKey);
      }
      hidden = null;
    }
    if (!reader.composingRead && reader.deferred.length > 0) {
      if (hidden === null) {
        hidden = new Hidden(composing!);
      }
      for (const it of reader.deferred) {
        hidden.add(it.id.client, it.id.clock, it.length);
      }
    }
    state.hidden = hidden;
    if (cursor !== null) {
      this.$restoreSelection(cursor);
    }
    $clampSelection();
    for (const y of childItems.keys()) {
      const key = state.keyByY.get(y);
      if (key !== undefined) {
        changedKeys.push(key);
      }
    }
  }

  /**
   * A remote read that throws (a reader bug) must not leave this client
   * showing something else than the document for good: the editor is
   * rebuilt from the shared content (a fresh reader's result, which every
   * client converges on) in a fresh update, and the failure is reported.
   */
  private recoverRead(error: unknown): void {
    this.warn(
      RECOVERED_READ_WARNING,
      `@lexical/y: a remote change could not be read and the editor was rebuilt from the document: ${String(
        error instanceof Error ? error.message : error,
      )}`,
      {error},
    );
    try {
      this.rebuildFromDocument();
    } catch (e) {
      this._editor._onError(e instanceof Error ? e : new Error(String(e)));
    }
  }

  /** Replace the editor's content with a fresh read of the shared root. */
  private rebuildFromDocument(): void {
    this.state = new State(this._editor, this._doc, this._root);
    let error: unknown = null;
    this._editor.update(
      () => {
        try {
          const root = $getRoot();
          root.clear();
          const reader = new Reader(this.state);
          const cs = this.state.newCS(this._root, 'root', 'b');
          reader.$readFull(cs, root);
          $setSelection(null);
        } catch (e) {
          error = e;
        }
      },
      {
        discrete: true,
        skipTransforms: true,
        tag: REMOTE_TAGS,
      },
    );
    if (error !== null) {
      throw error;
    }
    this.checkUnknownTypes();
    this.flushRefresh(true);
  }

  /**
   * The line or inline container holding the node being composed (IME), if
   * the binding stores it as one.
   */
  private $composingOwner(): NodeKey | null {
    const key = this._editor._compositionKey;
    const node = key === null ? null : $getNodeByKey(key);
    if (node === null || !node.isAttached()) {
      return null;
    }
    const owner = $isTextNode(node) ? $ownerOf(node) : null;
    if (owner === null) {
      return null;
    }
    const ownerKey = owner.getKey();
    const unit = this.state.unitByKey.get(ownerKey);
    if (unit !== undefined && unit.kind === 'line') {
      return ownerKey;
    }
    const cs = this.state.csByKey.get(ownerKey);
    return cs !== undefined && cs.kind === 'i' ? ownerKey : null;
  }

  /** Show the remote content hidden during a composition that has ended. */
  private flushHidden(): void {
    const hidden = this.state.hidden;
    if (hidden === null) {
      return;
    }
    const cursor = this.getCursor();
    this.state.hidden = null;
    this._editor.update(
      () => {
        new Reader(this.state).$refreshComposed(hidden.ownerKey);
        if (cursor !== null) {
          this.$restoreSelection(cursor);
        }
      },
      {
        discrete: true,
        skipTransforms: true,
        tag: REMOTE_TAGS,
      },
    );
  }

  /**
   * Repair shapes concurrent edits left in the containers a remote change
   * touched (see Repair): one repair at a time, each a pure function of the
   * shared content, written under a client id derived from its inputs and
   * output, so every client that sees the shape writes the same items. Not
   * while the local editor is composing or has a pending update (queued until
   * then). Repairs are not part of the undo history.
   */
  private runRepairs(changed: Iterable<YNode>): void {
    for (const y of changed) {
      this.repairQueue.add(y);
    }
    if (
      this.repairing ||
      this._status !== 'active' ||
      this._editor._compositionKey !== null ||
      this._editor._pendingEditorState !== null ||
      this.state.hidden !== null
    ) {
      return;
    }
    this.repairing = true;
    try {
      for (let guard = 0; this.repairQueue.size > 0 && guard < 256; guard++) {
        const ys = [...this.repairQueue].filter(y => !isDeleted(y));
        this.repairQueue.clear();
        const repair = this.nextRepair(ys);
        if (repair === null) {
          continue;
        }
        // Look at the same containers again after this repair.
        for (const y of ys) {
          this.repairQueue.add(y);
        }
        this.applyRepair(repair);
      }
    } finally {
      this.repairing = false;
      this.repairQueue.clear();
    }
  }

  private nextRepair(ys: YNode[]): Repair | null {
    for (const table of tablesOf(ys)) {
      if (!isDeleted(table)) {
        const repair = tableRepair(table);
        if (repair !== null) {
          return repair;
        }
      }
    }
    const nodes = this._editor._nodes;
    const keyOf = (node: YNode): string | null => {
      const name = String(node.name ?? '');
      const info = nodes.get(name.slice(2));
      const spec =
        info === undefined ? null : getContainerGroupSpec(info.klass);
      if (spec === null) {
        return null;
      }
      // The group's identity: its declared mergeAdjacent fields.
      return stableStringify(
        spec.key.map(f => node.getAttr(FIELD_PREFIX + f) ?? null),
      );
    };
    for (const y of ys) {
      const merges = findListMerges(y, keyOf);
      if (merges.length > 0) {
        return merges[0];
      }
    }
    return null;
  }

  private applyRepair(repair: Repair): void {
    this.transactAs(
      initClientID(
        'repair\u0000' +
          REPAIR_VERSION +
          '\u0000' +
          LAYOUT_VERSION +
          '\u0000' +
          repair.seed,
        this.clientIDRange(),
      ),
      tr => repair.write(tr),
      this.sharedRepairOrigin,
    );
  }

  /**
   * Run `fn` in a transaction written under `id`, a client id derived from
   * content. The real id is back before the transaction's observers and
   * update handlers run, so nothing else is ever written under `id` (a
   * provider that delivers updates synchronously from an update handler
   * would otherwise have this client read, and write follow-ups, under it).
   */
  private transactAs(
    id: number,
    fn: (tr: Transaction) => void,
    origin: unknown,
  ): void {
    const real = this._doc.clientID;
    this._doc.clientID = id;
    this.restoreClientID = real;
    try {
      this._doc.transact(fn, origin);
    } finally {
      this.restoreRealClientID();
    }
  }

  private restoreRealClientID(): void {
    if (this.restoreClientID !== null) {
      this._doc.clientID = this.restoreClientID;
      this.restoreClientID = null;
    }
  }

  /**
   * Recompute the derived fields (list numbering) of the groups a read or a
   * change touched. The group class's own transforms run directly, with the
   * group's siblings hidden: a transform that would also restructure (merge
   * an adjacent equal list) must not, as each peer would write that merge
   * (duplicating its items) and a fresh reader would build another tree.
   *
   * After a remote change (`remote`) in an editor that is not focused, the
   * refresh does not set the DOM selection (SKIP_DOM_SELECTION_TAG): the read
   * already restored it, and setting it would move the focus into that
   * editor. A focused editor sets it as usual, so a refresh that reshapes the
   * DOM under the caret (an app's list transform) keeps the caret in place.
   */
  private flushRefresh(remote: boolean): void {
    const state = this.state;
    if (state.refresh.size === 0) {
      return;
    }
    const keys = [...state.refresh];
    state.refresh.clear();
    this._editor.update(
      () => {
        for (const key of keys) {
          const node = $getNodeByKey(key);
          if (!$isElementNode(node) || !node.isAttached()) {
            continue;
          }
          const info = this._editor._nodes.get(node.getType());
          if (info === undefined) {
            continue;
          }
          const writable = node.getWritable();
          const {__prev, __next} = writable;
          writable.__prev = null;
          writable.__next = null;
          try {
            for (const transform of info.transforms) {
              if (!this.ownTransforms.has(transform) && writable.isAttached()) {
                transform(writable);
              }
            }
          } finally {
            writable.__prev = __prev;
            writable.__next = __next;
          }
        }
      },
      {
        discrete: true,
        skipTransforms: true,
        tag:
          remote && !this.hasFocus()
            ? [HISTORY_MERGE_TAG, REFRESH_TAG, SKIP_DOM_SELECTION_TAG]
            : [HISTORY_MERGE_TAG, REFRESH_TAG],
      },
    );
  }

  /** Whether the focus is inside this editor's root element. */
  private hasFocus(): boolean {
    const root = this._editor.getRootElement();
    return root !== null && root.contains(getActiveElement(root));
  }

  // -------------------------------------------------------------------------
  // Lexical -> Yjs

  private onUpdate({
    dirtyElements,
    dirtyLeaves,
    editorState,
    prevEditorState,
    tags,
  }: {
    dirtyElements: Map<NodeKey, boolean>;
    dirtyLeaves: Set<NodeKey>;
    editorState: EditorState;
    prevEditorState: EditorState;
    tags: Set<string>;
  }): void {
    if (!tags.has(REFRESH_TAG) && !tags.has(SKIP_COLLAB_TAG)) {
      // Every group whose children (or whose items' children) changed
      // recomputes its derived fields (list item values) in a refresh: remote
      // reads skip Lexical's transforms, and a local change inside an item
      // (a nested list appearing or going away) does not mark its list
      // dirty, so readers and the writer would number it differently.
      const prevMap = prevEditorState._nodeMap;
      const isGroup = (n: LexicalNode | null | undefined) =>
        n !== null &&
        n !== undefined &&
        $isElementNode(n) &&
        getGroupSpec(klassOf(n)) !== null;
      editorState.read(() => {
        for (const [key, intentional] of dirtyElements) {
          if (!intentional) {
            continue;
          }
          const node = $getNodeByKey(key);
          if (!$isElementNode(node)) {
            continue;
          }
          if (isGroup(node)) {
            // Its children changed (a remote read refreshes the groups it
            // rebuilds itself).
            if (!tags.has(COLLABORATION_TAG)) {
              this.state.refresh.add(key);
            }
            continue;
          }
          // An item that starts or stops holding a nested list.
          const parent = node.getParent();
          if (!isGroup(parent)) {
            continue;
          }
          const prev = prevMap.get(key);
          const wasWrapper =
            prev !== undefined &&
            $isElementNode(prev) &&
            prev.__first !== null &&
            isGroup(prevMap.get(prev.__first));
          if (wasWrapper !== isGroup(node.getFirstChild())) {
            this.state.refresh.add(parent!.getKey());
          }
        }
      });
    }
    if (
      this._status !== 'active' ||
      tags.has(COLLABORATION_TAG) ||
      tags.has(SKIP_COLLAB_TAG) ||
      (dirtyElements.size === 0 && dirtyLeaves.size === 0)
    ) {
      return;
    }
    const state = this.state;
    const written = new Set<YNode>();
    editorState.read(() => {
      const roles = new Roles(state);
      const plan = Writer.$plan(
        roles,
        dirtyElements,
        dirtyLeaves,
        prevEditorState,
      );
      const movedNodes = editorState._movedNodes;
      plan.moved =
        movedNodes === null ? null : movedNodes.get(prevEditorState._nodeMap);
      if (
        plan.structural.size === 0 &&
        plan.inline.size === 0 &&
        plan.lines.size === 0 &&
        plan.attrs.size === 0
      ) {
        return;
      }
      let writer: Writer | null = null;
      // Follow-up updates of a remote change (group refresh, repairs) are
      // not the user's edits: keep them out of the undo history.
      const origin =
        tags.has(REFRESH_TAG) || tags.has(REPAIR_TAG)
          ? this.repairOrigin
          : this;
      const seq = this.remoteSeq;
      // A normalization is written under a client id derived from exactly
      // what it writes (see normalizeShared), found by a dry run on a copy.
      const id = this.normalizeWrite
        ? this.$normalizeClientID(prevEditorState, plan)
        : null;
      try {
        const write = (tr: Transaction) => {
          writer = new Writer(state, roles, tr, prevEditorState, plan);
          writer.$run();
        };
        if (id !== null) {
          state.segmentPrefix = id.toString(36);
          try {
            this.transactAs(id, write, origin);
          } finally {
            state.segmentPrefix = null;
          }
        } else {
          this._doc.transact(write, origin);
        }
        // Kinds of types written for the first time, outside the undo
        // history (undoing the content must not forget how a type is stored).
        this._doc.transact(() => {
          this.recordPins(this._root, editorState, [
            ...dirtyElements.keys(),
            ...dirtyLeaves,
          ]);
        }, this.repairOrigin);
      } catch (e) {
        // A write that fails part way must not leave the document silently
        // behind the editor: rewrite every container (a diff against the
        // shared content, so nothing a peer wrote is lost) in a fresh
        // transaction, and report it.
        writer = null;
        this.warn(
          RECOVERED_WRITE_WARNING,
          '@lexical/y: a write failed and the document was rewritten: ' +
            String(e instanceof Error ? e.message : e),
          {error: e},
        );
        try {
          this._doc.transact(tr => {
            const all: WritePlan = {
              attrs: new Set(state.yByKey.keys()),
              inline: new Set(),
              lines: new Set(state.unitByKey.keys()),
              removedText: plan.removedText,
              structural: new Set(),
            };
            for (const [key, cs] of state.csByKey) {
              (cs.kind === 'b' ? all.structural : all.inline).add(key);
            }
            const rewriter = new Writer(
              state,
              new Roles(state),
              tr,
              prevEditorState,
              all,
            );
            rewriter.rewriteAll = true;
            rewriter.$run();
          }, origin);
        } catch (e2) {
          this._editor._onError(
            e2 instanceof Error ? e2 : new Error(String(e2)),
          );
        }
      }
      // Containers the change was written into (see normalizeShared).
      const fully: Iterable<NodeKey> =
        writer === null ? [] : (writer as Writer).written;
      for (const key of [...plan.structural, ...plan.inline, ...fully]) {
        const cs = state.csByKey.get(key);
        if (cs !== undefined) {
          written.add(cs.y);
        }
      }
      for (const key of plan.lines) {
        const unit = state.unitByKey.get(key);
        if (unit !== undefined) {
          written.add(unit.cs.y);
        }
      }
      // A change written without the normalization (see normalizeShared)
      // is compared once it is normalized: readers already build some of
      // that normalization (adjacent equal lists are one list).
      const unnormalized = this.$hasUnnormalized(written);
      const check = !unnormalized && this.options.selfCheck === true;
      // A remote change applied while this change was written (a provider
      // that delivers synchronously from an update handler) moved the shared
      // content on: the comparison would not be with what was written.
      if (
        check &&
        writer !== null &&
        this.remoteSeq === seq &&
        Math.random() < (this.options.selfCheckSample ?? 1)
      ) {
        const problems = $checkWrite(writer);
        // Whole containers: structural writes, and containers where a group
        // item's marker was written (group fields are shared by its items).
        const containers = new Set<CS>();
        for (const key of plan.structural) {
          const cs = state.csByKey.get(key);
          if (cs !== undefined) {
            containers.add(cs);
          }
        }
        for (const cs of (writer as Writer).groupWrites) {
          containers.add(cs);
        }
        for (const cs of containers) {
          if (sampleWholeContainer(cs)) {
            problems.push(...checkContainer(state, cs, editorState));
          }
        }
        if (problems.length > 0) {
          this.warn(
            SELF_CHECK_WARNING,
            '@lexical/y self-check: ' + problems.slice(0, 5).join('; '),
            {problems, remote: false},
          );
        }
      }
    });
    if (!tags.has(REFRESH_TAG)) {
      this.flushRefresh(false);
    } else {
      state.refresh.clear();
    }
    // A local change written without the normalization (an update with
    // skipTransforms) is normalized like a remote one, with the same inputs
    // and so the same repair as every reader's. A normalization's own write
    // queues the containers it wrote (a lifted table's cells).
    if (written.size > 0 && !tags.has(REFRESH_TAG)) {
      this.normalizeShared(written);
    }
  }

  // -------------------------------------------------------------------------
  // Undo

  /**
   * Undo keeps a container a peer has put content in, whole: with its
   * fields and the undoing client's own content in it (deleting those would
   * leave a malformed container).
   */
  private isKeptByUndo(item: Item): boolean {
    // A container this undo also restores elsewhere was moved (deleted and
    // written again): keeping the new copy would duplicate it.
    const moved = (it: Item): boolean =>
      this.restoring !== null && this.restoring.has(nameOf(it));
    if (isNonEmptyContainer(item, this.undoCache)) {
      return !moved(item);
    }
    for (
      let t: unknown = item.parent;
      t instanceof YNode && t !== this._root;
      t = t._item === null ? null : t._item.parent
    ) {
      // Only a container this undo deletes (one it inserted): the content
      // of other containers is undone as usual.
      if (
        t._item !== null &&
        this.removing !== null &&
        this.removing.has(t._item) &&
        isNonEmptyContainer(t._item, this.undoCache)
      ) {
        return !moved(t._item);
      }
    }
    return false;
  }

  undo(): boolean {
    const um = this._undoManager;
    if (um === null) {
      return false;
    }
    this.undoCache = new WeakMap();
    this.scanStackItem(um.undoStack);
    try {
      return um.undo() !== null;
    } finally {
      this.restoring = null;
      this.removing = null;
    }
  }

  redo(): boolean {
    const um = this._undoManager;
    if (um === null) {
      return false;
    }
    this.undoCache = new WeakMap();
    this.scanStackItem(um.redoStack);
    try {
      return um.redo() !== null;
    } finally {
      this.restoring = null;
      this.removing = null;
    }
  }

  /**
   * The stored nodes the next stack item restores (by name) and deletes
   * (items), for the undo delete filter.
   */
  private scanStackItem(stack: UndoManager['undoStack']): void {
    const top = stack[stack.length - 1];
    this.restoring = null;
    this.removing = null;
    if (top === undefined) {
      return;
    }
    const names = new Set<string>();
    const removing = new Set<Item>();
    const isStored = (s: unknown): s is Item => {
      if (!(s instanceof Item) || !(s.content instanceof ContentType)) {
        return false;
      }
      const name = nameOf(s);
      return name !== MARKER && name !== RUN_END;
    };
    this._doc.transact(tr => {
      iterateStructsByIdSet(tr, top.deletes, s => {
        if (isStored(s)) {
          names.add(nameOf(s));
        }
      });
      iterateStructsByIdSet(tr, top.inserts, s => {
        if (isStored(s)) {
          removing.add(s);
        }
      });
    }, this.scanOrigin);
    this.restoring = names;
    this.removing = removing;
  }

  // -------------------------------------------------------------------------
  // Cursors

  /** The local selection as relative positions (JSON), or null. */
  getCursor(): YCursor | null {
    return this._editor.getEditorState().read(() => {
      try {
        return this.$captureCursor();
      } catch (_e) {
        // A selection the editor itself left invalid: no cursor.
        return null;
      }
    });
  }

  /**
   * The current selection as relative positions. A collapsed caret is
   * anchored to the character on its left, so that it stays after what the
   * user just typed when a peer inserts at the same place; a range is
   * anchored to its first and last characters, so it does not grow over
   * concurrent inserts at its edges.
   */
  private $captureCursor(): YCursor | null {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) {
      return null;
    }
    const collapsed = selection.isCollapsed();
    const backward = selection.isBackward();
    const anchor = this.$relativePosition(
      selection.anchor,
      collapsed || backward,
    );
    const focus = this.$relativePosition(
      selection.focus,
      collapsed || !backward,
    );
    return anchor === null || focus === null ? null : {anchor, focus};
  }

  /** Resolve a cursor to Lexical points (call inside a read or update). */
  $resolveCursor(
    cursor: YCursor,
  ): {anchor: PointType; focus: PointType} | null {
    const anchor = this.$resolvePosition(cursor.anchor);
    const focus = this.$resolvePosition(cursor.focus);
    if (anchor === null || focus === null) {
      return null;
    }
    const selection = $createRangeSelection();
    selection.anchor.set(anchor.key, anchor.offset, anchor.type);
    selection.focus.set(focus.key, focus.offset, focus.type);
    return {anchor: selection.anchor, focus: selection.focus};
  }

  /**
   * Map the local selection through a remote change: resolve the cursor
   * captured before the transaction; points that cannot be resolved are
   * clamped to their node.
   */
  private $restoreSelection(cursor: YCursor): void {
    const current = $getSelection();
    if (current !== null && !$isRangeSelection(current)) {
      return;
    }
    let selection: RangeSelection | null = current;
    const anchor = this.$resolvePosition(cursor.anchor);
    const focus = this.$resolvePosition(cursor.focus);
    if (anchor !== null && focus !== null) {
      if (selection === null) {
        selection = $createRangeSelection();
        $setSelection(selection);
      }
      const same = (
        p: PointType,
        q: {key: NodeKey; offset: number; type: 'text' | 'element'},
      ) => p.key === q.key && p.offset === q.offset && p.type === q.type;
      if (!same(selection.anchor, anchor) || !same(selection.focus, focus)) {
        selection.anchor.set(anchor.key, anchor.offset, anchor.type);
        selection.focus.set(focus.key, focus.offset, focus.type);
      }
      return;
    }
    if (selection !== null) {
      for (const point of [selection.anchor, selection.focus]) {
        const node = $getNodeByKey(point.key);
        if (node === null || !node.isAttached()) {
          $setSelection(null);
          return;
        }
        const size = $isTextNode(node)
          ? node.getTextContentSize()
          : $isElementNode(node)
            ? node.getChildrenSize()
            : 0;
        if (point.offset > size) {
          point.set(point.key, size, point.type);
        }
      }
    }
  }

  private $relativePosition(point: PointType, preferLeft: boolean): unknown {
    const node = point.getNode();
    // Find the line (or inline container) and the atom offset within it.
    let offset = 0;
    let owner: ElementNode | null = null;
    let target: LexicalNode = node;
    if ($isTextNode(node)) {
      offset = point.offset;
    } else if ($isElementNode(node)) {
      const child = node.getChildAtIndex(point.offset);
      if (child === null) {
        // At the end of an element: the end of a line, or of the content of
        // a container or wrapper whose last child is the target.
        const last = node.getLastChild();
        if (last === null) {
          const unit = this.state.unitByKey.get(node.getKey());
          return unit !== undefined && unit.end !== null
            ? relativePositionToJSON(
                new RelativePosition(null, null, unit.end.id, 0),
              )
            : null;
        }
        target = last;
        offset = $atomSize(last);
      } else {
        target = child;
      }
      preferLeft = false;
    }
    const parent = $ownerOf(target);
    if (parent === null) {
      return null;
    }
    owner = parent;
    offset += $atomsBefore(parent, target);
    const unit = this.state.unitByKey.get(owner.getKey());
    let start: Item | null;
    if (unit !== undefined && unit.end !== null) {
      const left = prevLiveEnd(unit.end);
      start = left === null ? unit.cs.y._start : left.right;
    } else {
      const cs = this.state.csByKey.get(owner.getKey());
      if (cs === undefined || cs.kind !== 'i') {
        return null;
      }
      start = cs.y._start;
    }
    const at = (it: Item, d: number, assoc: number) =>
      relativePositionToJSON(
        new RelativePosition(
          null,
          null,
          {client: it.id.client, clock: it.id.clock + d} as Item['id'],
          assoc,
        ),
      );
    // Offsets count what the editor shows (not hidden remote content).
    const hidden = this.state.hidden;
    const unitAt = (it: Item, shown: number) =>
      hidden === null ? shown : hidden.unitAt(it, shown);
    let lastLive: Item | null = null;
    let lastLen = 0;
    for (let it = start; it !== null; it = it.right) {
      const len = shownLength(it, hidden);
      if (len === 0) {
        if (isEndItem(it) && !it.deleted) {
          break;
        }
        continue;
      }
      if (offset < len) {
        if (preferLeft && offset > 0) {
          return at(it, unitAt(it, offset - 1), -1);
        }
        if (preferLeft && offset === 0 && lastLive !== null) {
          return at(lastLive, unitAt(lastLive, lastLen - 1), -1);
        }
        return at(it, unitAt(it, offset), 0);
      }
      offset -= len;
      lastLive = it;
      lastLen = len;
      if (isEndItem(it)) {
        break;
      }
    }
    return null;
  }

  private $resolvePosition(
    json: unknown,
  ): {key: NodeKey; offset: number; type: 'text' | 'element'} | null {
    const rel = createRelativePositionFromJSON(json);
    if (rel.item === null) {
      return null;
    }
    const store = this._doc.store;
    if (store.getClock(rel.item.client) <= rel.item.clock) {
      return null;
    }
    const found = store.getItem(rel.item);
    if (!(found instanceof Item)) {
      return null;
    }
    let item: Item | null = found;
    let diff = rel.item.clock - found.id.clock;
    if (rel.assoc < 0) {
      // After a character: before the next live one.
      if (!found.deleted && found.countable && diff + 1 < found.length) {
        diff += 1;
      } else {
        let p: Item | null = found;
        if (found.deleted || !found.countable) {
          // The character is gone: after the nearest live one on its left.
          p = found.left;
          while (p !== null && (p.deleted || !p.countable)) {
            p = p.left;
          }
        }
        item = p === null ? (found.parent as YNode)._start : p.right;
        diff = 0;
      }
    }
    const hidden = this.state.hidden;
    while (item !== null && shownLength(item, hidden) === 0) {
      item = item.right;
      diff = 0;
    }
    if (item === null) {
      return null;
    }
    // Walk to the unit end; count atoms from the unit start.
    let end: Item | null = item;
    while (end !== null && (end.deleted || !isEndItem(end))) {
      end = end.right;
    }
    const parentY = item.parent as YNode;
    const unit = end === null ? undefined : this.state.unitByEnd.get(end);
    let ownerKey: NodeKey | undefined;
    let start: Item | null;
    if (unit !== undefined && unit.key !== null && unit.kind === 'line') {
      ownerKey = unit.key;
      const left = prevLiveEnd(end);
      start = left === null ? parentY._start : left.right;
    } else {
      const cs = this.state.containers.get(parentY);
      if (cs === undefined || cs.kind !== 'i') {
        return null;
      }
      ownerKey = cs.key;
      start = parentY._start;
    }
    let offset = 0;
    for (let it = start; it !== null && it !== item; it = it.right) {
      offset += shownLength(it, hidden);
    }
    offset +=
      item === end
        ? 0
        : hidden === null
          ? diff
          : hidden.shownBefore(item, diff);
    const owner = $getNodeByKey(ownerKey);
    if (!$isElementNode(owner)) {
      return null;
    }
    return $pointAtAtom(owner, offset);
  }

  /** @internal for tests: the container states. */
  _containers(): Map<NodeKey, CS> {
    return this.state.csByKey;
  }
}

function $atomSize(node: LexicalNode): number {
  if ($isTextNode(node)) {
    return node.getTextContentSize();
  }
  if ($isWrapper(node)) {
    return (node as ElementNode)
      .getChildren()
      .reduce((n, c) => n + $atomSize(c), 0);
  }
  return 1;
}

/** Keep the selection's points inside their nodes after a remote read. */
function $clampSelection(): void {
  const selection = $getSelection();
  if (!$isRangeSelection(selection)) {
    return;
  }
  for (const point of [selection.anchor, selection.focus]) {
    const node = $getNodeByKey(point.key);
    if (node === null || !node.isAttached()) {
      $setSelection(null);
      return;
    }
    const size = $isTextNode(node)
      ? node.getTextContentSize()
      : $isElementNode(node)
        ? node.getChildrenSize()
        : 0;
    if (point.offset > size) {
      point.set(point.key, size, point.type);
    }
  }
}

/** The line or inline container whose content holds `node`. */
function $ownerOf(node: LexicalNode): ElementNode | null {
  let parent = node.getParent();
  while (parent !== null && $isWrapper(parent)) {
    parent = parent.getParent();
  }
  return parent;
}

function $atomsBefore(owner: ElementNode, target: LexicalNode): number {
  let n = 0;
  const visit = (el: ElementNode): boolean => {
    for (const c of el.getChildren()) {
      if (c.is(target)) {
        return true;
      }
      if ($isWrapper(c)) {
        if (visit(c as ElementNode)) {
          return true;
        }
      } else {
        n += $atomSize(c);
      }
    }
    return false;
  };
  visit(owner);
  return n;
}

function $pointAtAtom(
  owner: ElementNode,
  offset: number,
): {key: NodeKey; offset: number; type: 'text' | 'element'} {
  let remaining = offset;
  let lastText = null as LexicalNode | null;
  const visit = (
    el: ElementNode,
  ): {key: NodeKey; offset: number; type: 'text' | 'element'} | null => {
    const children = el.getChildren();
    for (let i = 0; i < children.length; i++) {
      const c = children[i];
      if ($isWrapper(c)) {
        const r = visit(c as ElementNode);
        if (r !== null) {
          return r;
        }
        continue;
      }
      const size = $atomSize(c);
      if ($isTextNode(c)) {
        lastText = c;
        if (remaining <= size) {
          return {key: c.getKey(), offset: remaining, type: 'text'};
        }
      } else if (remaining === 0) {
        return {key: el.getKey(), offset: i, type: 'element'};
      }
      remaining -= size;
    }
    return null;
  };
  const found = visit(owner);
  if (found !== null) {
    return found;
  }
  if (lastText !== null) {
    const t = lastText as LexicalNode;
    return {key: t.getKey(), offset: $atomSize(t), type: 'text'};
  }
  return {
    key: owner.getKey(),
    offset: owner.getChildrenSize(),
    type: 'element',
  };
}

/**
 * Whether the normalization of shared content changes `node` (see
 * YBinding#normalizeShared): what NodeStructureExtension would change,
 * except a merge of a group (a list) stored as its own node (inside a line)
 * with an adjacent equal one, which the shared repairs perform (see
 * findListMerges); plus Lexical's shadow root rule (inline content directly
 * in a shadow root, such as a table cell, goes into a paragraph). Groups
 * stored as items of their container are merged by construction: their
 * merge only brings the editor in line with what readers build.
 */
function $needsRemoteNormalization(
  node: ElementNode,
  storedAsNode: boolean,
): boolean {
  if (node.isShadowRoot()) {
    return node.getChildren().some(c => !$isElementNode(c) && c.isInline());
  }
  if (storedAsNode && getContainerGroupSpec(klassOf(node)) !== null) {
    return $needsNodeStructureNormalization(node, false);
  }
  return $needsNodeStructureNormalization(node);
}

/** The normalization {@link $needsRemoteNormalization} describes. */
function $normalizeRemote(node: ElementNode, storedAsNode: boolean): void {
  if (node.isShadowRoot()) {
    // Runs of inline content directly in the shadow root go into paragraphs.
    let run: LexicalNode[] = [];
    const flush = () => {
      if (run.length > 0) {
        const p = $createParagraphNode();
        run[0].insertBefore(p);
        p.append(...run);
        run = [];
      }
    };
    for (const c of node.getChildren()) {
      if (!$isElementNode(c) && c.isInline()) {
        run.push(c);
      } else {
        flush();
      }
    }
    flush();
    return;
  }
  if (storedAsNode && getContainerGroupSpec(klassOf(node)) !== null) {
    $normalizeNodeStructure(node, false);
    return;
  }
  $normalizeNodeStructure(node);
}

/** The item holding `id` in `doc` (it exists). */
function itemById(doc: Doc, id: {client: number; clock: number}): Item {
  const structs = doc.store.clients.get(id.client)!;
  return structs[findIndexSS(structs, id.clock)] as Item;
}

/**
 * What a transaction wrote, independently of the writing client's id
 * (`client`, written as `@`): every item it inserted (its clock relative to
 * the first, content, parent, map key and neighbours) and which of them it
 * deleted. Two transactions with equal descriptions written under one
 * client id from the same clock insert identical items. `client` must be
 * new to the document (its first item has clock 0).
 */
function describeWrite(tr: Transaction, client: number): string {
  const doc = tr.doc;
  // The client is new to the document: its items start at clock 0.
  const first = 0;
  const ref = (id: {client: number; clock: number} | null): string =>
    id === null
      ? '-'
      : id.client === client
        ? `@${id.clock - first}`
        : `${id.client}:${id.clock}`;
  const parentOf = (it: Item): string => {
    const p = it.parent as YNode;
    return p._item === null ? 'r:' + findRootTypeKey(p) : ref(p._item.id);
  };
  const out: string[] = [];
  for (const s of doc.store.clients.get(client) ?? []) {
    if (!(s instanceof Item)) {
      continue;
    }
    const c = s.content;
    const content =
      c instanceof ContentString
        ? 's' + JSON.stringify(c.str)
        : c instanceof ContentType
          ? 't' + JSON.stringify(String(c.type.name ?? ''))
          : c instanceof ContentFormat
            ? 'f' + JSON.stringify([c.key, c.value])
            : c.constructor.name + JSON.stringify(c.getContent());
    out.push(
      `${ref(s.id)}/${s.length} ${parentOf(s)}${
        s.parentSub === null ? '' : '.' + JSON.stringify(s.parentSub)
      } ${ref(s.origin)} ${ref(s.rightOrigin)} ${content}`,
    );
  }
  // Deletions of other clients' items are left out: they are not part of
  // what the id identifies (peers writing the same items converge on the
  // union of their deletions, as with any concurrent deletions), and a peer
  // that has not received an item cannot delete it. Deletions of the
  // transaction's own items are part of those items' state.
  const deleted: string[] = [];
  const own = tr.deleteSet.clients.get(client);
  if (own !== undefined) {
    for (const r of own.getIds()) {
      deleted.push(`@${r.clock - first}+${r.len}`);
    }
  }
  return out.join('\n') + '\n-' + deleted.sort().join(',');
}

/**
 * A client id derived from content (initialization and repairs): a hash of
 * `seed` in the document's client id range (see {@link ClientIDRange}), 53
 * bits under `'uint53'` (Yjs 14's own range) and 32 bits under `'uint32'`.
 * Equal seeds give equal ids, so clients writing the same items from the
 * same inputs write them once. Different seeds share an id only with the
 * probability of a collision in that range (a shared id with different items
 * would diverge), the same odds as two random client ids. Every client of a
 * document must therefore use the same range.
 */
export function initClientID(
  seed: string,
  range: ClientIDRange = 'uint53',
): number {
  // cyrb53 (public domain).
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < seed.length; i++) {
    const ch = seed.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const id =
    range === 'uint53'
      ? 0x100000000 * (h2 & 0x1fffff) + (h1 >>> 0)
      : (h1 ^ h2) >>> 0;
  return id === 0 ? 1 : id;
}

/**
 * Undo must not delete a container a peer has put content in (its content
 * would go with it): a container holding live content of a client other
 * than the one that created it. The clients of each subtree are computed
 * once per undo (`cache`).
 */
/**
 * Containers of up to this many units (lines and nodes) get the
 * whole-container self-check after every structural change; bigger ones are
 * sampled (see YBindingOptions.selfCheck).
 */
const SELF_CHECK_FULL_UNITS = 256;

function sampleWholeContainer(cs: CS): boolean {
  const n = cs.units.length;
  return (
    n <= SELF_CHECK_FULL_UNITS || Math.random() < SELF_CHECK_FULL_UNITS / n
  );
}

/**
 * A table cell a repair added to pad a row, still empty: not content of
 * anyone (an undo that removes its row removes it too).
 */
function isEmptyPadding(it: Item): boolean {
  if (!(it.content instanceof ContentType)) {
    return false;
  }
  const y = it.content.type as YNode;
  if (y.getAttr(PAD_KEY) !== true) {
    return false;
  }
  let live = 0;
  for (let c = y._start; c !== null; c = c.right) {
    if (!c.deleted && c.countable) {
      if (++live > 1 || nameOf(c) !== MARKER) {
        return false;
      }
    }
  }
  return true;
}

function isNonEmptyContainer(
  item: Item,
  cache: WeakMap<YNode, Set<number>>,
): boolean {
  if (!(item.content instanceof ContentType)) {
    return false;
  }
  const name = nameOf(item);
  if (name === MARKER || name === RUN_END) {
    return false;
  }
  const clientsOf = (type: YNode): Set<number> => {
    let clients = cache.get(type);
    if (clients === undefined) {
      clients = new Set();
      for (let it = type._start; it !== null; it = it.right) {
        if (it.deleted || isEmptyPadding(it)) {
          continue;
        }
        if (it.countable) {
          clients.add(it.id.client);
        }
        if (it.content instanceof ContentType) {
          for (const c of clientsOf(it.content.type)) {
            clients.add(c);
          }
        }
      }
      cache.set(type, clients);
    }
    return clients;
  };
  for (const c of clientsOf(item.content.type)) {
    if (c !== item.id.client) {
      return true;
    }
  }
  return false;
}

/**
 * Keep local groups in the shape readers rebuild: adjacent top-level groups
 * with equal key fields are one group.
 */
function $canonicalizeGroup(node: ElementNode): void {
  const spec = getGroupSpec(klassOf(node));
  if (spec === null || !node.isAttached()) {
    return;
  }
  // A group without items has no shared representation (its items carry
  // it): remove it, with a nested-level wrapper it leaves empty.
  if (node.getChildrenSize() === 0) {
    const parent = node.getParent();
    node.remove();
    if (
      parent !== null &&
      parent.getChildrenSize() === 0 &&
      spec.items.includes(klassOf(parent)) &&
      parent.getParent() !== null &&
      getGroupSpec(klassOf(parent.getParent()!)) === spec
    ) {
      parent.remove();
    }
    return;
  }
  // The first declared key field only (see the reader's grouping).
  const sameKey = (a: ElementNode, b: ElementNode) => {
    if (klassOf(a) !== klassOf(b)) {
      return false;
    }
    const fa = $groupFields(a, spec);
    const fb = $groupFields(b, spec);
    return spec.key.every(
      f => stableStringify(fa[f] ?? null) === stableStringify(fb[f] ?? null),
    );
  };
  // Its own items: two adjacent wrapper items each holding an equal group
  // read back as one wrapper (an item between them was moved away).
  const nestedIn = (w: LexicalNode | null): ElementNode | null => {
    if (
      !$isElementNode(w) ||
      w.getChildrenSize() !== 1 ||
      !spec.items.includes(klassOf(w))
    ) {
      return null;
    }
    const g = w.getFirstChild();
    return $isElementNode(g) && getGroupSpec(klassOf(g)) === spec ? g : null;
  };
  for (let child = node.getFirstChild(); child !== null; ) {
    const next = child.getNextSibling();
    const a = nestedIn(child);
    const b = nestedIn(next);
    if (a !== null && b !== null && sameKey(a, b)) {
      $appendMerging(a, b, sameKey);
      next!.remove();
      continue;
    }
    child = next;
  }
  // Nested levels: two adjacent wrapper items each holding an equal group
  // read back as one wrapper.
  const wrapper = node.getParent();
  if (
    wrapper !== null &&
    wrapper.getChildrenSize() === 1 &&
    spec.items.includes(klassOf(wrapper))
  ) {
    const nestedOf = (w: LexicalNode | null): ElementNode | null => {
      if (!$isElementNode(w) || w.getChildrenSize() !== 1) {
        return null;
      }
      const g = w.getFirstChild();
      return $isElementNode(g) && klassOf(g) === klassOf(node) ? g : null;
    };
    const before = nestedOf(wrapper.getPreviousSibling());
    if (before !== null && sameKey(before, node)) {
      $appendMerging(before, node, sameKey);
      wrapper.remove();
      return;
    }
    const after = nestedOf(wrapper.getNextSibling());
    if (after !== null && sameKey(node, after)) {
      const afterWrapper = after.getParent()!;
      $appendMerging(node, after, sameKey);
      afterWrapper.remove();
    }
  }
  const prev = node.getPreviousSibling();
  if (
    $isElementNode(prev) &&
    getGroupSpec(klassOf(prev)) !== null &&
    sameKey(prev, node)
  ) {
    $appendMerging(prev, node, sameKey);
    node.remove();
    return;
  }
  const next = node.getNextSibling();
  if (
    $isElementNode(next) &&
    getGroupSpec(klassOf(next)) !== null &&
    sameKey(node, next)
  ) {
    $appendMerging(node, next, sameKey);
    next.remove();
  }
}

/**
 * Move the children of `source` to the end of `target`. Where the two
 * meet, two wrapper items each holding an equal nested group are merged
 * too (recursively), as a reader builds them: consecutive deeper items share
 * one wrapper.
 */
function $appendMerging(
  target: ElementNode,
  source: ElementNode,
  sameKey: (a: ElementNode, b: ElementNode) => boolean,
): void {
  const last = target.getLastChild();
  const children = source.getChildren();
  target.append(...children);
  const first = children[0];
  const nestedOf = (w: LexicalNode | null | undefined): ElementNode | null => {
    if (!$isElementNode(w) || w.getChildrenSize() !== 1) {
      return null;
    }
    const g = w.getFirstChild();
    return $isElementNode(g) && getGroupSpec(klassOf(g)) !== null ? g : null;
  };
  const a = nestedOf(last);
  const b = nestedOf(first);
  if (a !== null && b !== null && sameKey(a, b)) {
    $appendMerging(a, b, sameKey);
    first!.remove();
  }
}

export {typeOf};
