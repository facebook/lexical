/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalEditor} from 'lexical';

import useLayoutEffect from 'shared/useLayoutEffect';
import {useState} from 'react';
import {$canShowPlaceholderCurry} from 'lexical/root';

export default function useLexicalCanShowPlaceholder(
  editor: LexicalEditor,
): boolean {
  const [canShowPlaceholder, setCanShowPlaceholder] = useState(
    editor
      .getEditorState()
      .read($canShowPlaceholderCurry(editor.isComposing())),
  );

  useLayoutEffect(() => {
    return editor.addListener('update', ({editorState}) => {
      const isComposing = editor.isComposing();
      const currentCanShowPlaceholder = editorState.read(
        $canShowPlaceholderCurry(isComposing),
      );
      setCanShowPlaceholder(currentCanShowPlaceholder);
    });
  }, [editor]);
  return canShowPlaceholder;
}
