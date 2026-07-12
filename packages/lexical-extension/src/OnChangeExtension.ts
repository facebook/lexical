/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  defineExtension,
  type EditorState,
  HISTORY_MERGE_TAG,
  type LexicalEditor,
  safeCast,
} from 'lexical';

import {namedSignals} from './namedSignals';
import {effect} from './signals';

export interface OnChangeConfig {
  ignoreHistoryMergeTagChange: boolean;
  ignoreSelectionChange: boolean;
  onChange:
    | undefined
    | ((
        editorState: EditorState,
        editor: LexicalEditor,
        tags: Set<string>,
      ) => void);
}

/**
 * Calls `onChange` with the latest {@link EditorState} whenever the editor
 * updates. By default, updates that only change the selection, and updates that
 * are part of a history merge, are ignored; set `ignoreSelectionChange` or
 * `ignoreHistoryMergeTagChange` to control that filtering.
 */
export const OnChangeExtension = /* @__PURE__ */ defineExtension({
  build: (editor, config, state) => namedSignals(config),
  config: /* @__PURE__ */ safeCast<OnChangeConfig>({
    ignoreHistoryMergeTagChange: true,
    ignoreSelectionChange: false,
    onChange: undefined,
  }),
  name: '@lexical/extension/OnChange',
  register(editor, config, state) {
    const {ignoreHistoryMergeTagChange, ignoreSelectionChange, onChange} =
      state.getOutput();
    return effect(() => {
      const onChangeHandler = onChange && onChange.value;
      if (onChangeHandler) {
        return editor.registerUpdateListener(
          ({
            editorState,
            dirtyElements,
            dirtyLeaves,
            prevEditorState,
            tags,
          }) => {
            if (
              (ignoreSelectionChange.value &&
                dirtyElements.size === 0 &&
                dirtyLeaves.size === 0) ||
              (ignoreHistoryMergeTagChange.value &&
                tags.has(HISTORY_MERGE_TAG)) ||
              prevEditorState.isEmpty()
            ) {
              return;
            }

            onChangeHandler(editorState, editor, tags);
          },
        );
      }
    });
  },
});
