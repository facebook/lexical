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
  withEditable__DEPRECATED: boolean,
): boolean {
  const currentCanShowPlaceholder = editor
    .getEditorState()
    .read(
      $canShowPlaceholderCurry(
        editor.isComposing(),
        withEditable__DEPRECATED ? editor.isEditable() : undefined,
      ),
    );

  return currentCanShowPlaceholder;
}

export function useCanShowPlaceholder(
  editor: LexicalEditor,
  withEditable__DEPRECATED = true,
): boolean {
  const [canShowPlaceholder, setCanShowPlaceholder] = useState(() =>
    canShowPlaceholderFromCurrentEditorState(editor, withEditable__DEPRECATED),
  );

  useLayoutEffect(() => {
    function resetCanShowPlaceholder() {
      const currentCanShowPlaceholder =
        canShowPlaceholderFromCurrentEditorState(
          editor,
          withEditable__DEPRECATED,
        );
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
  }, [editor, withEditable__DEPRECATED]);

  return canShowPlaceholder;
}
