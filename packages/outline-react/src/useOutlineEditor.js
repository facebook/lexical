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

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';

export default function useOutlineEditor(
  onError: (Error) => void,
  editorThemeClasses?: EditorThemeClasses,
): [OutlineEditor, (null | HTMLElement) => void, boolean] {
  const [showPlaceholder, setShowPlaceholder] = useState(true);
  const showPlaceholderRef = useRef(true);
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
    return editor.addErrorListener(onError);
  }, [editor, onError]);
  useEffect(() => {
    return editor.addUpdateListener(() => {
      const canShowPlaceholder = editor.canShowPlaceholder();
      if (showPlaceholderRef.current !== canShowPlaceholder) {
        showPlaceholderRef.current = canShowPlaceholder;
        setShowPlaceholder(canShowPlaceholder);
      }
    });
  });

  return [editor, editorElementRef, showPlaceholder];
}
