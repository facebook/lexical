/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {EditorState, LexicalEditor} from 'lexical';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import useLayoutEffect from 'shared/useLayoutEffect';

export default function OnChangePlugin({
  ignoreInitialChange = true,
  ignoreSelectionChange = false,
  onChange,
}: {
  ignoreInitialChange?: boolean,
  ignoreSelectionChange?: boolean,
  onChange: (editorState: EditorState, editor: LexicalEditor) => void,
}): null {
  const [editor] = useLexicalComposerContext();
  useLayoutEffect(() => {
    if (onChange) {
      return editor.registerUpdateListener(
        ({editorState, dirtyElements, dirtyLeaves, prevEditorState}) => {
          if (
            ignoreSelectionChange &&
            dirtyElements.size === 0 &&
            dirtyLeaves.size === 0
          ) {
            return;
          }

          if (ignoreInitialChange && prevEditorState.isEmpty()) {
            return;
          }

          onChange(editorState, editor);
        },
      );
    }
  }, [editor, ignoreInitialChange, ignoreSelectionChange, onChange]);

  return null;
}
