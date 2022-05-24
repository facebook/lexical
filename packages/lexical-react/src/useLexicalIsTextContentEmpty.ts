/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor} from 'lexical';

import {$isRootTextContentEmptyCurry} from '@lexical/text';
import {useState} from 'react';
import useLayoutEffect from 'shared/useLayoutEffect';

export function useLexicalIsTextContentEmpty(
  editor: LexicalEditor,
  trim?: boolean,
): boolean {
  const [isEmpty, setIsEmpty] = useState(
    editor
      .getEditorState()
      .read($isRootTextContentEmptyCurry(editor.isComposing(), trim)),
  );

  useLayoutEffect(() => {
    return editor.registerUpdateListener(({editorState}) => {
      const isComposing = editor.isComposing();
      const currentIsEmpty = editorState.read(
        $isRootTextContentEmptyCurry(isComposing, trim),
      );
      setIsEmpty(currentIsEmpty);
    });
  }, [editor, trim]);

  return isEmpty;
}
