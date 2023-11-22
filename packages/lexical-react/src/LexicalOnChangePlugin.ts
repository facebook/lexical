/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {EditorState, LexicalEditor} from 'lexical';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {debounce} from 'lodash-es';
import useLayoutEffect from 'shared/useLayoutEffect';

export function OnChangePlugin({
  ignoreHistoryMergeTagChange = true,
  ignoreSelectionChange = false,
  debounceTime = 0,
  onChange,
}: {
  ignoreHistoryMergeTagChange?: boolean;
  ignoreSelectionChange?: boolean;
  debounceTime?: number;
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
            (ignoreHistoryMergeTagChange && tags.has('history-merge')) ||
            prevEditorState.isEmpty()
          ) {
            return;
          }

          if (debounceTime) {
            const debouncedOnChange = debounce(onChange, debounceTime);

            debouncedOnChange(editorState, editor, tags);
          } else {
            onChange(editorState, editor, tags);
          }
        },
      );
    }
  }, [editor, ignoreHistoryMergeTagChange, ignoreSelectionChange, onChange]);

  return null;
}
