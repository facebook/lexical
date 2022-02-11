/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {LexicalEditor} from 'lexical';

import {$isTextContentEmptyCurry} from '@lexical/helpers/root';
import {useState} from 'react';
import useLayoutEffect from 'shared/useLayoutEffect';

export default function useLexicalIsTextContentEmpty(
  editor: LexicalEditor,
  trim?: boolean,
): boolean {
  const [isEmpty, setIsEmpty] = useState(
    editor
      .getEditorState()
      .read($isTextContentEmptyCurry(editor.isComposing(), trim)),
  );

  useLayoutEffect(() => {
    return editor.addListener('update', ({editorState}) => {
      const isComposing = editor.isComposing();
      const currentIsEmpty = editorState.read(
        $isTextContentEmptyCurry(isComposing, trim),
      );
      setIsEmpty(currentIsEmpty);
    });
  }, [editor, trim]);
  return isEmpty;
}
