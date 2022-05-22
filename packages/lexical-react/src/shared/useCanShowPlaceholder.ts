/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor} from 'lexical';

import {$canShowPlaceholderCurry} from '@lexical/text';
import {useState} from 'react';
import useLayoutEffect from 'shared/useLayoutEffect';

export function useCanShowPlaceholder(editor: LexicalEditor): boolean {
  const [canShowPlaceholder, setCanShowPlaceholder] = useState(
    editor
      .getEditorState()
      .read($canShowPlaceholderCurry(editor.isComposing())),
  );

  useLayoutEffect(() => {
    return editor.registerUpdateListener(({editorState}) => {
      const isComposing = editor.isComposing();

      const currentCanShowPlaceholder = editorState.read(
        $canShowPlaceholderCurry(isComposing),
      );

      setCanShowPlaceholder(currentCanShowPlaceholder);
    });
  }, [editor]);

  return canShowPlaceholder;
}
