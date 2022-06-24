/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor} from 'lexical';

import {$canShowPlaceholderCurry} from '@lexical/text';
import {mergeRegister} from '@lexical/utils';
import {useState} from 'react';
import useLayoutEffect from 'shared/useLayoutEffect';

function canShowPlaceholderFromCurrentEditorState(
  editor: LexicalEditor,
): boolean {
  const currentCanShowPlaceholder = editor
    .getEditorState()
    .read($canShowPlaceholderCurry(editor.isComposing(), editor.isReadOnly()));

  return currentCanShowPlaceholder;
}

export function useCanShowPlaceholder(editor: LexicalEditor): boolean {
  const [canShowPlaceholder, setCanShowPlaceholder] = useState(() =>
    canShowPlaceholderFromCurrentEditorState(editor),
  );

  useLayoutEffect(() => {
    function update() {
      const currentCanShowPlaceholder =
        canShowPlaceholderFromCurrentEditorState(editor);
      setCanShowPlaceholder(currentCanShowPlaceholder);
    }
    update();
    return mergeRegister(
      editor.registerUpdateListener(() => {
        update();
      }),
      editor.registerReadOnlyListener(() => {
        update();
      }),
    );
  }, [editor]);

  return canShowPlaceholder;
}
