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
  defineExtension,
  HISTORY_MERGE_TAG,
  type LexicalEditor,
  safeCast,
  type SerializedEditorState,
} from 'lexical';

import {EditorStateExtension} from './EditorStateExtension';
import {getPeerDependencyFromEditor} from './getPeerDependencyFromEditor';
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
   * are isolated automatically. Must be a non-empty string when provided;
   * passing `''` triggers a dev warning and is treated as no `id`. Neither
   * `namespace` nor `id` should contain a colon (`:`), as that character is
   * used as a key separator internally.
   */
  id?: string;
}

const HMR_KEY = 'lexicalHMR';
const HMR_COUNT_KEY = 'lexicalHMR__count';
const HISTORY_EXTENSION_NAME = '@lexical/history/History';

function getHMRKey(id: string | undefined, namespace: string): string {
  const base = `${HMR_KEY}:${namespace}`;
  return id !== undefined ? `${base}:${id}` : base;
}

function getHMRCountKey(namespace: string): string {
  return `${HMR_COUNT_KEY}:${namespace}`;
}

interface SerializedHistoryState {
  current: SerializedEditorState | null;
  undoStack: SerializedEditorState[];
  redoStack: SerializedEditorState[];
}

interface HMRSavedState {
  editable: boolean;
  editorStateJSON: SerializedEditorState;
  // Unknown because isValidHMRSavedState does not inspect this field;
  // callers must guard with isValidSerializedHistoryState before use.
  historyStateJSON: unknown;
}

function getSavedHMRState(hot: HotContext, key: string): unknown {
  return hot.data[key];
}

function isValidHMRSavedState(raw: unknown): raw is HMRSavedState {
  if (raw == null || typeof raw !== 'object') {
    return false;
  }
  const s = raw as Record<string, unknown>;
  const has = (k: string) => Object.prototype.hasOwnProperty.call(s, k);
  if (!has('editable') || !has('editorStateJSON') || !has('historyStateJSON')) {
    return false;
  }
  const json = s.editorStateJSON;
  if (
    typeof s.editable !== 'boolean' ||
    typeof json !== 'object' ||
    json === null
  ) {
    return false;
  }
  const root = (json as Record<string, unknown>).root;
  return (
    typeof root === 'object' &&
    root !== null &&
    Array.isArray((root as Record<string, unknown>).children)
  );
}

function isValidSerializedHistoryState(
  raw: unknown,
): raw is SerializedHistoryState {
  if (raw == null || typeof raw !== 'object') {
    return false;
  }
  const s = raw as Record<string, unknown>;
  return Array.isArray(s.undoStack) && Array.isArray(s.redoStack);
}

function serializeHistoryState(
  historyState: HistoryState,
): SerializedHistoryState {
  const serializeEntry = (entry: HistoryStateEntry): SerializedEditorState =>
    entry.editorState.toJSON();
  return {
    current: historyState.current ? serializeEntry(historyState.current) : null,
    redoStack: historyState.redoStack.map(serializeEntry),
    undoStack: historyState.undoStack.map(serializeEntry),
  };
}

function restoreHistoryState(
  serialized: SerializedHistoryState,
  editor: LexicalEditor,
): HistoryState {
  const restoreEntry = (json: SerializedEditorState): HistoryStateEntry => {
    const editorState = editor.parseEditorState(json);
    if (editorState.isEmpty()) {
      throw new Error('HMR: history entry is empty');
    }
    return {editor, editorState};
  };
  const current = serialized.current ? restoreEntry(serialized.current) : null;
  const undoStack = serialized.undoStack.map(restoreEntry);
  const redoStack = serialized.redoStack.map(restoreEntry);
  return {current, redoStack, undoStack};
}

/**
 * Preserves editor state, editability, and undo/redo history across Hot Module
 * Replacement (HMR) cycles. When `HistoryExtension` is present as a peer,
 * undo/redo stacks are preserved as well.
 *
 * Passing `hot: null` is a safe no-op, so `import.meta.hot ?? null` works
 * correctly in both development and production without a build-time
 * conditional. If a saved state cannot be parsed, the extension warns in dev
 * and falls back to `$initialEditorState` rather than throwing.
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
 */
export const HMRExtension = /* @__PURE__ */ defineExtension({
  afterRegistration(editor, {hot, id: configId}, state) {
    if (!hot) {
      return () => {};
    }

    const namespace = editor._config.namespace;
    // Normalize '' to undefined: empty string is invalid and treated as no id.
    const id = configId === '' ? undefined : configId;
    const hmrKey = getHMRKey(id, namespace);

    if (__DEV__) {
      if (configId === '') {
        console.warn(
          'HMR: `id` must not be an empty string. ' +
            'Use a stable non-empty string literal (e.g. `"main"`, `"sidebar"`).',
        );
      }
      if (id === undefined) {
        const countKey = getHMRCountKey(namespace);
        const raw = hot.data[countKey];
        const count = (typeof raw === 'number' ? raw : 0) + 1;
        hot.data[countKey] = count;
        if (count > 1) {
          console.warn(
            'HMR: Multiple editors share the same HMR context and namespace without a unique `id`. ' +
              'Provide `HMRConfig.id` to keep their states independent, ' +
              'or give each editor a distinct `namespace`.',
          );
        }
      }
    }

    const historyPeer = getPeerDependencyFromEditor<typeof HistoryExtension>(
      editor,
      HISTORY_EXTENSION_NAME,
    );

    const saved = getSavedHMRState(hot, hmrKey);
    if (isValidHMRSavedState(saved)) {
      try {
        editor.setEditable(saved.editable);
        const restoredState = editor.parseEditorState(saved.editorStateJSON);
        if (!restoredState.isEmpty()) {
          editor.setEditorState(restoredState, {tag: HISTORY_MERGE_TAG});
          if (isValidSerializedHistoryState(saved.historyStateJSON)) {
            if (historyPeer) {
              try {
                historyPeer.output.historyState.value = restoreHistoryState(
                  saved.historyStateJSON,
                  editor,
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
    const stopSaveEffect = effect(() => {
      const editorState = editorStateSignal.value;
      const editable = editableSignal.value;
      const prev = getSavedHMRState(hot, hmrKey);
      // On first mount the state is empty before $initialEditorState runs;
      // keep the previously saved state instead of overwriting with empty.
      const validPrev =
        editorState.isEmpty() && isValidHMRSavedState(prev) ? prev : null;
      const nextState: HMRSavedState = {
        editable,
        editorStateJSON:
          validPrev != null ? validPrev.editorStateJSON : editorState.toJSON(),
        historyStateJSON:
          validPrev != null
            ? validPrev.historyStateJSON
            : historyPeer
              ? // peek() — avoid subscribing this effect to historyState changes;
                // editor-state updates already cover every history mutation.
                serializeHistoryState(historyPeer.output.historyState.peek())
              : null,
      };
      hot.data[hmrKey] = nextState;
    });

    return () => {
      if (__DEV__ && id === undefined) {
        const countKey = getHMRCountKey(namespace);
        const raw = hot.data[countKey];
        const count = typeof raw === 'number' ? raw : 0;
        if (count > 0) {
          hot.data[countKey] = count - 1;
        }
      }
      stopSaveEffect();
    };
  },
  config: /* @__PURE__ */ safeCast<HMRConfig>({hot: null}),
  dependencies: [EditorStateExtension, WatchEditableExtension],
  name: '@lexical/extension/HMR',
});
