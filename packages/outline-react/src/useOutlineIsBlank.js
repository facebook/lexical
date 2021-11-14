/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {OutlineEditor} from 'outline';

import useLayoutEffect from './shared/useLayoutEffect';
import {useState} from 'react';
import {isBlank2} from 'outline/root';

export default function useOutlineIsBlank(editor: OutlineEditor): boolean {
  const [isCurrentlyBlank, setIsBlank] = useState(
    editor
      .getEditorState()
      .read((state) => isBlank2(state, editor.isComposing())),
  );

  useLayoutEffect(() => {
    return editor.addListener('update', ({editorState}) => {
      const isComposing = editor.isComposing();
      const isBlank = editorState.read((state) => isBlank2(state, isComposing));
      setIsBlank(isBlank);
    });
  }, [editor]);
  return isCurrentlyBlank;
}
