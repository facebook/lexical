/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  LexicalEditor,
  LexicalNode,
  EditorState,
  EditorThemeClasses,
} from 'lexical';

import {Class} from 'utility-types';

export function createHeadlessEditor(editorConfig?: {
  editorState?: EditorState;
  theme?: EditorThemeClasses;
  parentEditor?: LexicalEditor;
  nodes?: ReadonlyArray<Class<LexicalNode>>;
  onError: (error: Error) => void;
  disableEvents?: boolean;
  readOnly?: boolean;
}): LexicalEditor;
