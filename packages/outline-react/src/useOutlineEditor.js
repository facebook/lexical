/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {OutlineEditor, EditorThemeClasses} from 'outline';

import {createEditor} from 'outline';

import {useCallback, useEffect, useMemo} from 'react';

export default function useOutlineEditor(
  placeholder: string,
  onError: (Error) => void,
  editorThemeClasses?: EditorThemeClasses,
): [OutlineEditor, (null | HTMLElement) => void] {
  const editor = useMemo(
    () => createEditor(editorThemeClasses),
    [editorThemeClasses],
  );
  const editorElementRef = useCallback(
    (editorElement: null | HTMLElement) => {
      editor.setEditorElement(editorElement);
    },
    [editor],
  );
  useEffect(() => {
    editor.setPlaceholder(placeholder);
  }, [editor, placeholder]);
  useEffect(() => {
    if (editor !== null) {
      return editor.addErrorListener(onError);
    }
  }, [editor, onError]);

  return [editor, editorElementRef];
}
