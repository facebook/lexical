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
  namespace?: string,
  onError?: (error: Error, log: Array<string>) => void,
  initialEditorState?: EditorState,
  theme?: EditorThemeClasses,
  context?: EditorContext,
  htmlTransforms?: DOMConversionMap,
  parentEditor?: LexicalEditor,
  disableEvents?: boolean,
}): [LexicalEditor, (null | HTMLElement) => void, boolean] {
  const onError =
    (editorConfig !== undefined && editorConfig.onError) ||
    defaultOnErrorHandler;
  const editor = useMemo(() => {
    if (editorConfig !== undefined) {
      // eslint-disable-next-line no-unused-vars
      const {onError: _onError, ...config} = editorConfig;
      return createEditor(config);
    }
    return createEditor(editorConfig);
  }, [editorConfig]);
  const [rootElementRef, showPlaceholder] = useLexicalEditor(editor, onError);

  return [editor, rootElementRef, showPlaceholder];
}
