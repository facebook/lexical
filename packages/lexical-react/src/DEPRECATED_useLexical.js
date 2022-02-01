/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  LexicalEditor,
  EditorThemeClasses,
  EditorState,
  DOMConversionMap,
} from 'lexical';

import {createEditor} from 'lexical';
import {useMemo} from 'react';
import useLexicalEditor from './DEPRECATED_useLexicalEditor';

function defaultOnErrorHandler(e: Error): void {
  throw e;
}

export default function useLexical<EditorContext>(editorConfig?: {
  context?: EditorContext,
  disableEvents?: boolean,
  htmlTransforms?: DOMConversionMap,
  initialEditorState?: EditorState,
  namespace?: string,
  onError?: (error: Error, log: Array<string>) => void,
  parentEditor?: LexicalEditor,
  theme?: EditorThemeClasses,
}): [LexicalEditor, (null | HTMLElement) => void, boolean] {
  const onError =
    (editorConfig !== undefined && editorConfig.onError) ||
    defaultOnErrorHandler;
  const editor = useMemo(() => createEditor(editorConfig), [editorConfig]);
  const [rootElementRef, showPlaceholder] = useLexicalEditor(editor, onError);

  return [editor, rootElementRef, showPlaceholder];
}
