/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import { unsupported_convertLegacyJSONEditorState } from '@lexical/utils';
import {useEffect} from 'react';

export function AutoFocusPlugin(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    editor.focus();
    return editor.registerUpdateListener(({editorState}) => {
      const json = JSON.stringify(editorState);
      const newEditorState = unsupported_convertLegacyJSONEditorState(editor, json);
      console.log(newEditorState)
    })
  }, [editor]);

  return null;
}
