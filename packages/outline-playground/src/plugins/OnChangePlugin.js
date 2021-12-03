/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineEditor, EditorState} from 'outline';

import {useOutlineComposerContext} from 'outline-react/OutlineComposerContext';
import useLayoutEffect from 'shared/useLayoutEffect';

export default function OnChangePlugin({
  onChange,
}: {
  onChange: (editorState: EditorState, editor: OutlineEditor) => void,
}): null {
  const [editor] = useOutlineComposerContext();
  useLayoutEffect(() => {
    if (onChange) {
      return editor.addListener('update', ({editorState}) => {
        onChange(editorState, editor);
      });
    }
  }, [editor, onChange]);

  return null;
}
