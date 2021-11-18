/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineEditor, EditorState} from 'outline';

import PlaygroundController from '../controllers/PlaygroundController';
import {useController} from 'outline-react/OutlineController';
import useLayoutEffect from 'shared/useLayoutEffect';

export default function OnChangePlugin({
  onChange,
}: {
  onChange: (editorState: EditorState, editor: OutlineEditor) => void,
}): null {
  const [editor] = useController(PlaygroundController);
  useLayoutEffect(() => {
    if (onChange) {
      return editor.addListener('update', ({editorState}) => {
        onChange(editorState, editor);
      });
    }
  }, [editor, onChange]);

  return null;
}
