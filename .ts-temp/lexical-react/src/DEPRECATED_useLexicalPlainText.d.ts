/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { HistoryState } from './DEPRECATED_useLexicalHistory';
import type { EditorState, LexicalEditor } from 'lexical';
export declare function useLexicalPlainText(editor: LexicalEditor, externalHistoryState?: HistoryState, initialEditorState?: null | string | EditorState | (() => void)): void;
