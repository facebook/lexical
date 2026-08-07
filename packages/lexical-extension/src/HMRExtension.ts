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
  type EditorState,
  HISTORY_MERGE_TAG,
  type LexicalEditor,
  type LexicalNode,
  safeCast,
} from 'lexical';

import {EditorStateExtension} from './EditorStateExtension';
import {getPeerDependencyFromEditor} from './getPeerDependencyFromEditor';
import {effect} from './signals';
import {WatchEditableExtension} from './WatchEditableExtension';

const __DEV__ = process.env.NODE_ENV !== 'production';

/**
 * Minimal interface for bundler HMR contexts. Satisfied by Vite's
 * `ViteHotContext` and similar bundler HMR contexts.
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
}

const HMR_KEY = 'lexicalHMR';
const HISTORY_EXTENSION_NAME = '@lexical/history/History';

interface HMRSavedState {
  editable: boolean;
  editorState: EditorState;
  historyState: HistoryState | null;
}

function getSavedHMRState(hot: HotContext): HMRSavedState | undefined {
  return hot.data[HMR_KEY] as HMRSavedState | undefined;
}

function swapNodePrototypes(
  nodeMap: ReadonlyMap<string, LexicalNode>,
  editor: LexicalEditor,
): void {
  for (const node of nodeMap.values()) {
    const registered = editor._nodes.get(node.__type);
    if (registered) {
      Object.setPrototypeOf(node, registered.klass.prototype);
    } else if (__DEV__) {
      console.warn(
        `HMR: Node type "${node.__type}" is not registered in the new editor. Its prototype was not updated.`,
      );
    }
  }
}

function updateHistoryEntries(
  historyState: HistoryState,
  editor: LexicalEditor,
): void {
  const update = (entry: HistoryStateEntry) => {
    entry.editor = editor;
    swapNodePrototypes(entry.editorState._nodeMap, editor);
  };
  if (historyState.current) {
    update(historyState.current);
  }
  for (const entry of historyState.undoStack) {
    update(entry);
  }
  for (const entry of historyState.redoStack) {
    update(entry);
  }
}

/**
 * Preserves editor state, editability, and undo history across Hot Module
 * Replacement (HMR) cycles. When `HistoryExtension` is present as a peer,
 * undo/redo stacks are preserved as well.
 *
 * @example
 * ```ts
 * import {buildEditorFromExtensions, configExtension, HMRExtension} from '@lexical/extension';
 * import {RichTextExtension} from '@lexical/rich-text';
 * import {HistoryExtension} from '@lexical/history';
 *
 * const editor = buildEditorFromExtensions({
 *   name: '[root]',
 *   dependencies: [
 *     RichTextExtension,
 *     HistoryExtension,
 *     configExtension(HMRExtension, {hot: import.meta.hot ?? null}),
 *   ],
 * });
 * ```
 */
export const HMRExtension = /* @__PURE__ */ defineExtension({
  afterRegistration(editor, {hot}, state) {
    if (!hot) {
      return () => {};
    }

    const saved = getSavedHMRState(hot);
    if (saved) {
      try {
        editor.setEditable(saved.editable);

        if (!saved.editorState.isEmpty()) {
          swapNodePrototypes(saved.editorState._nodeMap, editor);
          editor.setEditorState(saved.editorState, {tag: HISTORY_MERGE_TAG});

          if (saved.historyState) {
            const historyPeer = getPeerDependencyFromEditor<
              typeof HistoryExtension
            >(editor, HISTORY_EXTENSION_NAME);
            if (historyPeer) {
              updateHistoryEntries(saved.historyState, editor);
              historyPeer.output.historyState.value = saved.historyState;
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
    const historyPeer = getPeerDependencyFromEditor<typeof HistoryExtension>(
      editor,
      HISTORY_EXTENSION_NAME,
    );
    return effect(() => {
      const editorState = editorStateSignal.value;
      const editable = editableSignal.value;
      const prev = getSavedHMRState(hot);
      hot.data[HMR_KEY] = safeCast<HMRSavedState>({
        editable,
        editorState:
          editorState.isEmpty() && prev ? prev.editorState : editorState,
        historyState: historyPeer
          ? historyPeer.output.historyState.value
          : null,
      });
    });
  },
  config: /* @__PURE__ */ safeCast<HMRConfig>({hot: null}),
  dependencies: [EditorStateExtension, WatchEditableExtension],
  name: '@lexical/extension/HMR',
});
