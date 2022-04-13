/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  EditorState,
  GridSelection,
  LexicalEditor,
  NodeSelection,
  RangeSelection,
} from 'lexical';
export type HistoryStateEntry = {
  editor: LexicalEditor;
  editorState: EditorState;
  undoSelection?: RangeSelection | NodeSelection | GridSelection | null;
};
export type HistoryState = {
  current: null | HistoryStateEntry;
  redoStack: Array<HistoryStateEntry>;
  undoStack: Array<HistoryStateEntry>;
};
export function HistoryPlugin(arg0: {
  externalHistoryState?: HistoryState;
}): JSX.Element | null;
export function createEmptyHistoryState(): HistoryState;
