/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  HistoryExtension,
  HistoryState,
  HistoryStateEntry,
} from '@lexical/history';

import {
  $createNodeSelection,
  $createRangeSelection,
  $getRoot,
  $getSelection,
  $isElementNode,
  $isNodeSelection,
  $isRangeSelection,
  $isRootNode,
  $isTextNode,
  $setSelection,
  defineExtension,
  type EditorState,
  HISTORY_MERGE_TAG,
  type LexicalEditor,
  type LexicalNode,
  type PointType,
  safeCast,
} from 'lexical';

import {EditorStateExtension} from './EditorStateExtension';
import {getPeerDependencyFromEditor} from './getPeerDependencyFromEditor';
import {LexicalBuilder} from './LexicalBuilder';
import {RootElementExtension} from './RootElementExtension';
import {effect} from './signals';
import {WatchEditableExtension} from './WatchEditableExtension';

const __DEV__ = process.env.NODE_ENV !== 'production';

/**
 * Minimal interface for bundler HMR contexts. Satisfied by Vite's
 * `ViteHotContext` and similar bundler HMR contexts. Only the `data`
 * property is read and written; other HMR lifecycle methods are not required.
 *
 * Webpack and Parcel expose `module.hot` instead of `import.meta.hot`. Their
 * `module.hot.data` is populated by dispose handlers and is not directly
 * mutable, so `module.hot` cannot be passed here — a custom adapter using
 * `module.hot.addDisposeHandler` is required for those bundlers.
 */
export interface HotContext {
  readonly data: Record<string, unknown>;
}

/** Configuration for {@link HMRExtension}. */
export interface HMRConfig {
  /**
   * The bundler's HMR context, typically `import.meta.hot`. Pass `null`
   * in production or when HMR is not available.
   */
  hot: HotContext | null;
  /**
   * Stable identifier for this editor instance. Must be stable across HMR
   * reloads — do not use `useId()`, `Math.random()`, or any per-mount
   * identifier (these generate a new value on every mount and will fail to
   * match the key from the previous HMR cycle, preventing state restoration).
   * Only needed when multiple editors share both the same `import.meta.hot`
   * context and the same `namespace` (set via
   * `defineExtension({ namespace: '...' })` or
   * `createEditor({ namespace: '...' })`); editors with distinct namespaces
   * are isolated automatically, and editors with no configured namespace all
   * share one key. Must be a non-empty string when provided;
   * passing `''` triggers a dev warning and is treated as no `id`. Neither
   * `namespace` nor `id` should contain a colon (`:`), as that character is
   * used as a key separator internally.
   */
  id?: string;
}

const HMR_KEY = 'lexicalHMR';
const HISTORY_EXTENSION_NAME = '@lexical/history/History';

function getHMRKey(id: string | undefined, namespace: string): string {
  const base = `${HMR_KEY}:${namespace}`;
  return id !== undefined ? `${base}:${id}` : base;
}

/**
 * True when the editor's namespace was chosen by the application rather than
 * generated for it.
 *
 * `createEditor` falls back to a random `createUID()` namespace, which is a
 * different string on every reload: an HMR key built from it would never match
 * the key the previous instance saved under, so nothing would ever be restored
 * and every reload would leave another orphaned entry (pinning a whole
 * EditorState and its history) in `hot.data`. Such editors are keyed with an
 * empty namespace segment instead, which is stable. Two of them sharing one
 * HMR context then collide on that key, which is what the shared-key warning
 * in the save effect reports.
 */
function hasConfiguredNamespace(editor: LexicalEditor): boolean {
  if (editor._parentEditor !== null) {
    // Inherited from the parent editor, which is where the namespace — and
    // any HMRExtension keyed on it — belongs.
    return true;
  }
  const builder = LexicalBuilder.maybeFromEditor(editor);
  if (!builder) {
    return true;
  }
  for (const rep of builder.extensionNameMap.values()) {
    if (rep.extension.namespace !== undefined) {
      return true;
    }
  }
  return false;
}

// Keyed by HMR key, so a collision is reported once per module instance
// instead of on every editor update.
const warnedSharedKeys = new Set<string>();

/**
 * Warns when two editors that are both mounted write to the same HMR key,
 * which means each reload restores one editor's content into both.
 *
 * The editor being replaced by an HMR cycle is not a collision: the composer
 * builds the replacement during render and disposes the old editor in an
 * effect cleanup, so the two overlap by construction. They are told apart by
 * the root element — an editor that React discarded (a StrictMode double
 * render) or disposed has none.
 */
function warnOnSharedKey(
  hmrKey: string,
  prev: HMRSavedState,
  editor: LexicalEditor,
): void {
  const owner = prev.owner;
  if (
    owner === undefined ||
    owner === editor ||
    prev.mounted !== true ||
    owner.getRootElement() === null ||
    warnedSharedKeys.has(hmrKey)
  ) {
    return;
  }
  warnedSharedKeys.add(hmrKey);
  console.warn(
    `HMR: Two mounted editors are sharing the HMR key "${hmrKey}", so they will overwrite each other's saved state. ` +
      'Give each editor a distinct `namespace`, or a distinct `HMRConfig.id`.',
  );
}

/**
 * What is stashed in `hot.data` between module instances.
 *
 * The editor and history states are stored by reference, not serialized.
 * Serializing on every editor update is far too expensive for a document of
 * any size (the whole document plus every undo and redo entry, on every
 * keystroke), and it is wasted work in the common case where no reload ever
 * happens. The previous module instance stays alive for as long as `hot.data`
 * holds these references, so they can be serialized once, by the next module
 * instance, at the moment HMR actually takes place.
 */
interface HMRSavedState {
  editable: boolean;
  /** The live EditorState of the editor that is being replaced. */
  editorState: EditorState;
  /**
   * Reads the selection of a state that this snapshot carries. It is the
   * function of the module instance that owns those states, so it runs with
   * the `lexical` module that created them — necessary when `lexical` is
   * itself part of the HMR graph, where `$getSelection()` from this instance
   * would not find an active editor state. Optional: a payload saved by an
   * older build has none.
   */
  captureSelection?: (editorState: EditorState) => unknown;
  /** The editor that wrote this snapshot, for the shared-key warning. */
  owner?: LexicalEditor;
  /** Whether `owner` had a root element when it wrote this snapshot. */
  mounted?: boolean;
  // Unknown because isValidHMRSavedState does not inspect this field;
  // callers must guard with isValidHistoryState before use.
  historyState: unknown;
}

/**
 * A point of the previous selection, addressed by its path from the root
 * rather than by NodeKey. `parseEditorState` assigns fresh keys, so the keys
 * of the previous editor mean nothing to the new one — but a document restored
 * from that state's own JSON has the same shape, so the same path leads to the
 * same node.
 */
interface SavedPoint {
  offset: number;
  path: readonly number[];
  type: 'element' | 'text';
}

type SavedSelection =
  | {
      anchor: SavedPoint;
      focus: SavedPoint;
      format: number;
      style: string;
      type: 'range';
    }
  | {paths: readonly (readonly number[])[]; type: 'node'};

function getSavedHMRState(hot: HotContext, key: string): unknown {
  return hot.data[key];
}

/**
 * Structural check rather than `$isEditorState`: the saved value was created
 * by the module instance that HMR replaced. When `lexical` itself is part of
 * the HMR graph (as it is for an app that builds it from source), the previous
 * `EditorState` class is a different object than the current one, so
 * `instanceof` would reject a perfectly usable state.
 */
function isEditorStateLike(raw: unknown): raw is EditorState {
  return (
    typeof raw === 'object' &&
    raw !== null &&
    typeof (raw as EditorState).toJSON === 'function' &&
    typeof (raw as EditorState).isEmpty === 'function'
  );
}

function isValidHMRSavedState(raw: unknown): raw is HMRSavedState {
  if (raw == null || typeof raw !== 'object') {
    return false;
  }
  const s = raw as Record<string, unknown>;
  const has = (k: string) => Object.prototype.hasOwnProperty.call(s, k);
  return (
    has('editable') &&
    has('editorState') &&
    has('historyState') &&
    typeof s.editable === 'boolean' &&
    isEditorStateLike(s.editorState)
  );
}

function isValidHistoryState(raw: unknown): raw is HistoryState {
  if (raw == null || typeof raw !== 'object') {
    return false;
  }
  const s = raw as Record<string, unknown>;
  return Array.isArray(s.undoStack) && Array.isArray(s.redoStack);
}

/**
 * Re-create `editorState` for `editor` by round-tripping it through JSON,
 * restoring `selection` into the result.
 *
 * The nodes of the previous state are never reused: they are frozen in dev
 * builds and their classes may have been replaced by the reload, so they are
 * re-created from JSON with the classes registered on the new editor. The
 * selection is applied inside the parse, so it is part of the state that comes
 * back rather than a second update on top of it.
 */
function reparseEditorState(
  editorState: EditorState,
  editor: LexicalEditor,
  selection: SavedSelection | null,
): EditorState {
  return editor.parseEditorState(editorState.toJSON(), () => {
    // An empty root means the state was never initialized. Leaving it without
    // a selection keeps `isEmpty()` true, which is how the caller knows to
    // fall back to $initialEditorState.
    if (selection !== null && !$getRoot().isEmpty()) {
      $restoreSelection(selection);
    }
  });
}

function $getNodePath(node: LexicalNode): number[] | null {
  const path: number[] = [];
  let current = node;
  while (!$isRootNode(current)) {
    const parent = current.getParent();
    if (parent === null) {
      // A node detached from the root cannot be addressed by a path.
      return null;
    }
    path.push(current.getIndexWithinParent());
    current = parent;
  }
  return path.reverse();
}

function $capturePoint(point: PointType): SavedPoint | null {
  const path = $getNodePath(point.getNode());
  return path === null ? null : {offset: point.offset, path, type: point.type};
}

/**
 * Reads `editorState`'s selection into a form that survives re-parsing. Only
 * called when HMR takes place — walking to the root is proportional to the
 * number of siblings, so it has no business running on every update.
 */
function captureSelection(editorState: EditorState): SavedSelection | null {
  return editorState.read((): SavedSelection | null => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      const anchor = $capturePoint(selection.anchor);
      const focus = $capturePoint(selection.focus);
      return anchor === null || focus === null
        ? null
        : {
            anchor,
            focus,
            format: selection.format,
            style: selection.style,
            type: 'range',
          };
    }
    if ($isNodeSelection(selection)) {
      const paths: number[][] = [];
      for (const node of selection.getNodes()) {
        const path = $getNodePath(node);
        if (path === null) {
          return null;
        }
        paths.push(path);
      }
      return paths.length === 0 ? null : {paths, type: 'node'};
    }
    return null;
  });
}

function isValidPath(raw: unknown): raw is number[] {
  return Array.isArray(raw) && raw.every(index => typeof index === 'number');
}

function isValidSavedPoint(raw: unknown): raw is SavedPoint {
  if (raw == null || typeof raw !== 'object') {
    return false;
  }
  const s = raw as Record<string, unknown>;
  return (
    typeof s.offset === 'number' &&
    (s.type === 'text' || s.type === 'element') &&
    isValidPath(s.path)
  );
}

function isValidSavedSelection(raw: unknown): raw is SavedSelection {
  if (raw == null || typeof raw !== 'object') {
    return false;
  }
  const s = raw as Record<string, unknown>;
  if (s.type === 'node') {
    return Array.isArray(s.paths) && s.paths.every(isValidPath);
  }
  return (
    s.type === 'range' &&
    isValidSavedPoint(s.anchor) &&
    isValidSavedPoint(s.focus) &&
    typeof s.format === 'number' &&
    typeof s.style === 'string'
  );
}

function $resolvePath(path: readonly number[]): LexicalNode | null {
  let node: LexicalNode = $getRoot();
  for (const index of path) {
    if (!$isElementNode(node)) {
      return null;
    }
    const child = node.getChildAtIndex(index);
    if (child === null) {
      return null;
    }
    node = child;
  }
  return node;
}

function $setPoint(point: PointType, saved: SavedPoint): boolean {
  const node = $resolvePath(saved.path);
  // The offsets are clamped rather than trusted: a node transform may have
  // reshaped the document after it was restored.
  if (saved.type === 'text') {
    if (!$isTextNode(node)) {
      return false;
    }
    point.set(
      node.getKey(),
      Math.min(saved.offset, node.getTextContentSize()),
      'text',
    );
    return true;
  }
  if (!$isElementNode(node)) {
    return false;
  }
  point.set(
    node.getKey(),
    Math.min(saved.offset, node.getChildrenSize()),
    'element',
  );
  return true;
}

function $restoreSelection(saved: SavedSelection): void {
  if (saved.type === 'node') {
    const selection = $createNodeSelection();
    for (const path of saved.paths) {
      const node = $resolvePath(path);
      if (node === null) {
        return;
      }
      selection.add(node.getKey());
    }
    $setSelection(selection);
    return;
  }
  const selection = $createRangeSelection();
  if (
    $setPoint(selection.anchor, saved.anchor) &&
    $setPoint(selection.focus, saved.focus)
  ) {
    selection.format = saved.format;
    selection.style = saved.style;
    $setSelection(selection);
  }
}

/**
 * Reads the selection of one of the saved states, using the capture function
 * of the module instance that created it. A selection that cannot be read is
 * not worth failing a restore over.
 */
function captureSavedSelection(
  capture: HMRSavedState['captureSelection'],
  editorState: EditorState,
): SavedSelection | null {
  if (typeof capture !== 'function') {
    return null;
  }
  try {
    const saved = capture(editorState);
    return isValidSavedSelection(saved) ? saved : null;
  } catch (e) {
    if (__DEV__) {
      console.warn('HMR: Could not restore the previous selection.', e);
    }
    return null;
  }
}

function restoreHistoryState(
  saved: HistoryState,
  editor: LexicalEditor,
  capture: HMRSavedState['captureSelection'],
): HistoryState {
  let dropped = 0;
  const restoreEntry = (entry: HistoryStateEntry): HistoryStateEntry | null => {
    try {
      const editorState = reparseEditorState(
        entry.editorState,
        editor,
        captureSavedSelection(capture, entry.editorState),
      );
      if (!editorState.isEmpty()) {
        return {editor, editorState};
      }
    } catch {
      // One entry that no longer parses costs that entry, not the whole
      // undo and redo history.
    }
    dropped++;
    return null;
  };
  const restoreStack = (
    stack: readonly HistoryStateEntry[],
  ): HistoryStateEntry[] =>
    stack
      .map(restoreEntry)
      .filter((entry): entry is HistoryStateEntry => entry !== null);
  const current = saved.current ? restoreEntry(saved.current) : null;
  const undoStack = restoreStack(saved.undoStack);
  const redoStack = restoreStack(saved.redoStack);
  if (__DEV__ && dropped > 0) {
    console.warn(
      `HMR: Dropped ${dropped} undo/redo ${
        dropped === 1 ? 'entry' : 'entries'
      } that could not be restored.`,
    );
  }
  return {current, redoStack, undoStack};
}

/**
 * Preserves editor state, the selection, editability, and undo/redo history
 * across Hot Module Replacement (HMR) cycles. When `HistoryExtension` is
 * present as a peer, undo/redo stacks are preserved as well.
 *
 * Passing `hot: null` is a safe no-op, so `import.meta.hot ?? null` works
 * correctly in both development and production without a build-time
 * conditional. If a saved state cannot be parsed, the extension warns in dev
 * and falls back to `$initialEditorState` rather than throwing.
 *
 * Editor updates only stash a reference to the current `EditorState` (and to
 * the `HistoryState`, which `@lexical/history` mutates in place), so the
 * per-update cost does not grow with the size of the document or of the undo
 * stack. Everything is serialized once, by the module instance that replaces
 * this one, when it restores the saved state.
 *
 * The selection is restored by path from the root rather than by `NodeKey`,
 * since re-parsing the document assigns fresh keys. A selection that no longer
 * resolves — because a node class now imports its JSON differently, say — is
 * dropped, leaving the restored content untouched.
 *
 * @example
 * Basic usage
 * ```ts
 * import {buildEditorFromExtensions, configExtension, defineExtension, HMRExtension} from '@lexical/extension';
 * import {RichTextExtension} from '@lexical/rich-text';
 * import {HistoryExtension} from '@lexical/history';
 *
 * const editor = buildEditorFromExtensions(
 *   defineExtension({
 *     name: '[root]',
 *     namespace: 'my-editor',
 *     dependencies: [
 *       RichTextExtension,
 *       HistoryExtension,
 *       configExtension(HMRExtension, {hot: import.meta.hot ?? null}),
 *     ],
 *   }),
 * );
 * ```
 *
 * @example
 * Multiple editors sharing an HMR context
 * Editors with distinct `namespace` values are isolated automatically. Only
 * add `id` when two editors share both the same `import.meta.hot` context
 * and the same `namespace`.
 * ```ts
 * // Different namespaces — automatic isolation, no `id` needed
 * defineExtension({ name: '[main]', namespace: 'main', dependencies: [configExtension(HMRExtension, {hot: import.meta.hot ?? null})] })
 * defineExtension({ name: '[sidebar]', namespace: 'sidebar', dependencies: [configExtension(HMRExtension, {hot: import.meta.hot ?? null})] })
 *
 * // Same namespace — use `id` to distinguish
 * defineExtension({ name: '[first]', namespace: 'shared', dependencies: [configExtension(HMRExtension, {hot: import.meta.hot ?? null, id: 'first'})] })
 * defineExtension({ name: '[second]', namespace: 'shared', dependencies: [configExtension(HMRExtension, {hot: import.meta.hot ?? null, id: 'second'})] })
 * ```
 *
 * An editor that was given no `namespace` at all is keyed without one, because
 * the namespace `createEditor` generates for it is a fresh random string on
 * every reload — a key built from that would never match what the previous
 * instance saved. Such editors all share one key, so give each editor a
 * `namespace` (or an `id`) as soon as a page has more than one.
 *
 * Saved state belongs to the key for as long as the page lives, not to the
 * reload that produced it. An editor that is unmounted and later remounted
 * under the same key during development restores what the previous one had
 * rather than its own `$initialEditorState`, so two editors showing different
 * documents need distinct namespaces (or ids) even when they are never on
 * screen at the same time.
 */
export const HMRExtension = defineExtension({
  afterRegistration(editor, {hot, id: configId}, state) {
    if (!hot) {
      return () => {};
    }

    // An unconfigured namespace is a random string that changes on every
    // reload, so it is left out of the key rather than making it unmatchable.
    const namespace = hasConfiguredNamespace(editor)
      ? editor._config.namespace
      : '';
    // Normalize '' to undefined: empty string is invalid and treated as no id.
    const id = configId === '' ? undefined : configId;
    const hmrKey = getHMRKey(id, namespace);

    if (__DEV__ && configId === '') {
      console.warn(
        'HMR: `id` must not be an empty string. ' +
          'Use a stable non-empty string literal (e.g. `"main"`, `"sidebar"`).',
      );
    }

    const historyPeer = getPeerDependencyFromEditor<typeof HistoryExtension>(
      editor,
      HISTORY_EXTENSION_NAME,
    );

    const saved = getSavedHMRState(hot, hmrKey);
    if (isValidHMRSavedState(saved)) {
      try {
        editor.setEditable(saved.editable);
        // The only place the previous state is serialized. HMR has just
        // happened, so this cost is paid once per reload instead of on every
        // editor update.
        const restoredState = reparseEditorState(
          saved.editorState,
          editor,
          captureSavedSelection(saved.captureSelection, saved.editorState),
        );
        if (!restoredState.isEmpty()) {
          editor.setEditorState(restoredState, {tag: HISTORY_MERGE_TAG});
          if (isValidHistoryState(saved.historyState)) {
            if (historyPeer) {
              try {
                historyPeer.output.historyState.value = restoreHistoryState(
                  saved.historyState,
                  editor,
                  saved.captureSelection,
                );
              } catch (e) {
                historyPeer.output.historyState.value = {
                  current: null,
                  redoStack: [],
                  undoStack: [],
                };
                if (__DEV__) {
                  console.warn(
                    'HMR: Could not restore undo/redo history. History cleared.',
                    e,
                  );
                }
              }
            } else if (__DEV__) {
              console.warn(
                'HMR: Saved undo/redo history discarded — HistoryExtension is no longer configured.',
              );
            }
          }
        }
      } catch (e) {
        if (__DEV__) {
          console.warn(
            'HMR: Could not restore previous editor state. Starting fresh.',
            e,
          );
        }
      }
    }

    const editorStateSignal = state.getDependency(EditorStateExtension).output;
    const editableSignal = state.getDependency(WatchEditableExtension).output;
    const rootElementSignal = state.getDependency(RootElementExtension).output;
    return effect(() => {
      const editorState = editorStateSignal.value;
      const editable = editableSignal.value;
      const mounted = rootElementSignal.value !== null;
      const prev = getSavedHMRState(hot, hmrKey);
      if (__DEV__ && mounted && isValidHMRSavedState(prev)) {
        warnOnSharedKey(hmrKey, prev, editor);
      }
      // On first mount the state is empty before $initialEditorState runs;
      // keep the previously saved state instead of overwriting with empty.
      const validPrev =
        editorState.isEmpty() && isValidHMRSavedState(prev) ? prev : null;
      // Only references are stored, so this stays cheap no matter how large
      // the document or the undo stack gets.
      const nextState: HMRSavedState = {
        ...(validPrev ?? {
          captureSelection,
          editorState,
          historyState: historyPeer
            ? // peek() — avoid subscribing this effect to historyState
              // changes; @lexical/history mutates the HistoryState in place,
              // so this reference stays current on its own.
              historyPeer.output.historyState.peek()
            : null,
        }),
        editable,
        mounted,
        owner: editor,
      };
      hot.data[hmrKey] = nextState;
    });
  },
  config: safeCast<HMRConfig>({hot: null}),
  dependencies: [
    EditorStateExtension,
    RootElementExtension,
    WatchEditableExtension,
  ],
  name: '@lexical/extension/HMR',
});
