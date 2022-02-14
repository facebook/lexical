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
  LexicalNode,
} from 'lexical';

import {createEditor} from 'lexical';
import {useMemo} from 'react';
import useLexicalEditor from './DEPRECATED_useLexicalEditor';

export default function useLexical<EditorContext>(editorConfig?: {
  namespace?: string,
  onError?: (error: Error, log: Array<string>) => void,
  editorState?: EditorState,
  theme?: EditorThemeClasses,
  context?: EditorContext,
  nodes?: Array<Class<LexicalNode>>,
  htmlTransforms?: DOMConversionMap,
  parentEditor?: LexicalEditor,
  disableEvents?: boolean,
}): [LexicalEditor, (null | HTMLElement) => void, boolean] {
  const editor = useMemo(() => {
    if (editorConfig !== undefined) {
      return createEditor(editorConfig);
    }
    return createEditor(editorConfig);
  }, [editorConfig]);
  const [rootElementRef, showPlaceholder] = useLexicalEditor(editor);

  return [editor, rootElementRef, showPlaceholder];
}
