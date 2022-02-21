/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  EditorState,
  EditorThemeClasses,
  LexicalEditor,
  LexicalNode,
} from 'lexical';

import {createEditor} from 'lexical';
import {useMemo} from 'react';

import useLexicalEditor from './DEPRECATED_useLexicalEditor';

export default function useLexical<EditorContext>(editorConfig?: {
  context?: EditorContext,
  disableEvents?: boolean,
  editorState?: EditorState,
  namespace?: string,
  nodes?: Array<Class<LexicalNode>>,
  onError?: (error: Error) => void,
  parentEditor?: LexicalEditor,
  theme?: EditorThemeClasses,
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
