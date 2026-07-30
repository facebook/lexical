/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {$canShowPlaceholderCurry} from '@lexical/text';
import {type LexicalEditor, mergeRegister} from 'lexical';
import {useState} from 'react';

import useLayoutEffect from './useLayoutEffect';

function canShowPlaceholderFromCurrentEditorState(
  editor: LexicalEditor,
): boolean {
  const currentCanShowPlaceholder = editor.read(
    'latest',
    $canShowPlaceholderCurry(editor.isComposing()),
  );

  return currentCanShowPlaceholder;
}

export function useCanShowPlaceholder(editor: LexicalEditor): boolean {
  const [canShowPlaceholder, setCanShowPlaceholder] = useState(() =>
    canShowPlaceholderFromCurrentEditorState(editor),
  );

  useLayoutEffect(() => {
    function resetCanShowPlaceholder() {
      const currentCanShowPlaceholder =
        canShowPlaceholderFromCurrentEditorState(editor);
      setCanShowPlaceholder(currentCanShowPlaceholder);
    }
    resetCanShowPlaceholder();
    return mergeRegister(
      editor.registerUpdateListener(() => {
        resetCanShowPlaceholder();
      }),
      editor.registerEditableListener(() => {
        resetCanShowPlaceholder();
      }),
    );
  }, [editor]);

  return canShowPlaceholder;
}
