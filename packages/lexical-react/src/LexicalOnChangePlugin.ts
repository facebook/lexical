/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {type EditorState, HISTORY_MERGE_TAG, type LexicalEditor} from 'lexical';

import useLayoutEffect from './shared/useLayoutEffect';

/**
 * Calls `onChange` with the latest {@link EditorState} whenever the editor
 * updates. By default, updates that only change the selection, and updates that
 * are part of a history merge, are ignored; set `ignoreSelectionChange` or
 * `ignoreHistoryMergeTagChange` to control that filtering.
 *
 * @returns `null`, this plugin renders no DOM of its own.
 */
export function OnChangePlugin({
  ignoreHistoryMergeTagChange = true,
  ignoreSelectionChange = false,
  onChange,
}: {
  ignoreHistoryMergeTagChange?: boolean;
  ignoreSelectionChange?: boolean;
  onChange: (
    editorState: EditorState,
    editor: LexicalEditor,
    tags: Set<string>,
  ) => void;
}): null {
  const [editor] = useLexicalComposerContext();

  useLayoutEffect(() => {
    if (onChange) {
      return editor.registerUpdateListener(
        ({editorState, dirtyElements, dirtyLeaves, prevEditorState, tags}) => {
          if (
            (ignoreSelectionChange &&
              dirtyElements.size === 0 &&
              dirtyLeaves.size === 0) ||
            (ignoreHistoryMergeTagChange && tags.has(HISTORY_MERGE_TAG)) ||
            prevEditorState.isEmpty()
          ) {
            return;
          }

          onChange(editorState, editor, tags);
        },
      );
    }
  }, [editor, ignoreHistoryMergeTagChange, ignoreSelectionChange, onChange]);

  return null;
}
