/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineEditor, EditorThemeClasses, EditorState} from 'outline';

import {createEditor} from 'outline';
import useOutlineCanShowPlaceholder from 'outline-react/useOutlineCanShowPlaceholder';

import {useCallback, useMemo} from 'react';
import useLayoutEffect from './shared/useLayoutEffect';

function defaultOnErrorHandler(e: Error): void {
  throw e;
}

export default function useOutlineEditor<EditorContext>(editorConfig?: {
  onError?: (error: Error, log: Array<string>) => void,
  initialEditorState?: EditorState,
  theme?: EditorThemeClasses,
  context?: EditorContext,
}): [OutlineEditor, (null | HTMLElement) => void, boolean] {
  const editor = useMemo(() => createEditor(editorConfig), [editorConfig]);
  const rootElementRef = useCallback(
    (rootElement: null | HTMLElement) => {
      editor.setRootElement(rootElement);
    },
    [editor],
  );
  const showPlaceholder = useOutlineCanShowPlaceholder(editor);
  const onError =
    (editorConfig !== undefined && editorConfig.onError) ||
    defaultOnErrorHandler;
  useLayoutEffect(() => {
    return editor.addListener('error', onError);
  }, [editor, onError]);

  return [editor, rootElementRef, showPlaceholder];
}
