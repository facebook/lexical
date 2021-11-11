/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {EditorState, NodeKey} from 'outline';
import type {Adapter} from './Adapter';

export function syncOutlineUpdateToYjs(
  adapter: Adapter,
  prevEditorState: EditorState,
  editorState: EditorState,
  dirtyNodes: Set<NodeKey>,
): void {
  adapter.doc.transact(() => {
    editorState.read((state) => {
      // Update nodes
      if (dirtyNodes.size > 0) {
        // TODO: update nodes
      }
      const prevSelection = prevEditorState._selection;
      const selection = state.getSelection();
      if (selection !== null && !selection.is(prevSelection)) {
        // TODO: update selection
      }
    });
  });
}
