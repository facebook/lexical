/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  createEmptyHistoryState,
  type HistoryExtension,
  type HistoryState,
  type HistoryStateEntry,
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
   * identifier. Optional for a single-editor setup; recommended when multiple
   * editors share the same `import.meta.hot` context, to prevent their saved
   * states from overwriting each other (omitting `id` in that case triggers a
   * dev warning). Must be a non-empty string when provided; passing `''`
   * triggers a dev warning.
   */
  id?: string;
}

const HMR_KEY = 'lexicalHMR';
const HMR_COUNT_KEY = 'lexicalHMR__count';
const HISTORY_EXTENSION_NAME = '@lexical/history/History';

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

function getHMRKey(id: string | undefined): string {
  return id !== undefined ? `${HMR_KEY}:${id}` : HMR_KEY;
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
 * Passing `hot: null` is a safe no-op and is the recommended pattern for
 * production builds. If a saved state cannot be parsed, the extension warns
 * in dev and falls back to `$initialEditorState` rather than throwing.
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
 * ```ts
 * configExtension(HMRExtension, {hot: import.meta.hot ?? null, id: 'main'})
 * configExtension(HMRExtension, {hot: import.meta.hot ?? null, id: 'sidebar'})
 * ```
 */
export const HMRExtension = /* @__PURE__ */ defineExtension({
  afterRegistration(editor, {hot, id}, state) {
    if (!hot) {
      return () => {};
    }

    const hmrKey = getHMRKey(id);

    if (__DEV__) {
      if (id === '') {
        console.warn(
          'HMR: `id` must not be an empty string. ' +
            'Use a stable non-empty string literal (e.g. `"main"`, `"sidebar"`).',
        );
      } else if (id === undefined) {
        const raw = hot.data[HMR_COUNT_KEY];
        const count = (typeof raw === 'number' ? raw : 0) + 1;
        hot.data[HMR_COUNT_KEY] = count;
        if (count > 1) {
          console.warn(
            'HMR: Multiple editors share the same HMR context without a unique `id`. ' +
              'Provide `HMRConfig.id` to keep their states independent.',
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
                historyPeer.output.historyState.value =
                  createEmptyHistoryState();
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
        const raw = hot.data[HMR_COUNT_KEY];
        const count = typeof raw === 'number' ? raw : 0;
        if (count > 0) {
          hot.data[HMR_COUNT_KEY] = count - 1;
        }
      }
      stopSaveEffect();
    };
  },
  config: /* @__PURE__ */ safeCast<HMRConfig>({hot: null}),
  dependencies: [EditorStateExtension, WatchEditableExtension],
  name: '@lexical/extension/HMR',
});
