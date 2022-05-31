/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  EditorState,
  EditorThemeClasses,
  LexicalEditor,
  LexicalNode,
} from 'lexical';

import {createEditor} from 'lexical';
import {useMemo} from 'react';
import {Class} from 'utility-types';

import {useLexicalEditor} from './DEPRECATED_useLexicalEditor';

export function useLexical(editorConfig: {
  disableEvents?: boolean;
  editorState?: EditorState;
  nodes?: ReadonlyArray<Class<LexicalNode>>;
  onError: (error: Error) => void;
  parentEditor?: LexicalEditor;
  readOnly?: boolean;
  theme?: EditorThemeClasses;
}): [LexicalEditor, (arg0: null | HTMLElement) => void, boolean] {
  const editor = useMemo(
    () => createEditor(editorConfig), // Init
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [rootElementRef, showPlaceholder] = useLexicalEditor(editor);

  return [editor, rootElementRef, showPlaceholder];
}
