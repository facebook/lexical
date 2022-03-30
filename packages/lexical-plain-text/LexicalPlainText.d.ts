/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */
import type {EditorState, LexicalEditor} from 'lexical';
export type InitialEditorStateType = null | string | EditorState | (() => void);

declare function registerPlainText(
  editor: LexicalEditor,
  initialEditorState?: InitialEditorStateType,
): () => void;
