/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {EditorState, OutlineEditor, State} from 'outline';

export const editorStatesWithoutHistory: Set<EditorState> = new Set();

export function updateWithoutHistory(
  editor: OutlineEditor,
  updateFn: (state: State) => void,
): boolean {
  const res = editor.update(updateFn);
  const pendingEditorState = editor._pendingEditorState;
  if (pendingEditorState !== null) {
    editorStatesWithoutHistory.add(pendingEditorState);
  }
  return res;
}
