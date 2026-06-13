/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {EditorState, LexicalEditor} from 'lexical';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {FOCUS_TAG, HISTORY_MERGE_TAG} from 'lexical';

import useLayoutEffect from './shared/useLayoutEffect';

export function OnChangePlugin({
  ignoreFocusChange = false,
  ignoreHistoryMergeTagChange = true,
  ignoreSelectionChange = false,
  onChange,
}: {
  ignoreFocusChange?: boolean;
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
            (ignoreFocusChange && tags.has(FOCUS_TAG)) ||
            prevEditorState.isEmpty()
          ) {
            return;
          }

          onChange(editorState, editor, tags);
        },
      );
    }
  }, [
    editor,
    ignoreFocusChange,
    ignoreHistoryMergeTagChange,
    ignoreSelectionChange,
    onChange,
  ]);

  return null;
}
