/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalEditor, EditorState} from '@lexical/core';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import useLayoutEffect from 'shared/useLayoutEffect';

export default function OnChangePlugin({
  onChange,
}: {
  onChange: (editorState: EditorState, editor: LexicalEditor) => void,
}): null {
  const [editor] = useLexicalComposerContext();
  useLayoutEffect(() => {
    if (onChange) {
      return editor.addListener('update', ({editorState}) => {
        onChange(editorState, editor);
      });
    }
  }, [editor, onChange]);

  return null;
}
