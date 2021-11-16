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
import {useMemo} from 'react';
import useOutlineEditor from './useOutlineEditor';

function defaultOnErrorHandler(e: Error): void {
  throw e;
}

export default function useOutline<EditorContext>(editorConfig?: {
  onError?: (error: Error, log: Array<string>) => void,
  initialEditorState?: EditorState,
  theme?: EditorThemeClasses,
  context?: EditorContext,
}): [OutlineEditor, (null | HTMLElement) => void, boolean] {
  const onError =
    (editorConfig !== undefined && editorConfig.onError) ||
    defaultOnErrorHandler;
  const editor = useMemo(() => createEditor(editorConfig), [editorConfig]);
  const [rootElementRef, showPlaceholder] = useOutlineEditor(editor, onError);

  return [editor, rootElementRef, showPlaceholder];
}
