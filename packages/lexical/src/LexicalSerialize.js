/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalEditor} from './LexicalEditor';

import {removeNode} from './LexicalNode';
import {$getRoot, $isRootNode} from 'lexical';
import invariant from 'shared/invariant';
import {createEmptyEditorState} from './LexicalEditorState';
import {flushRootMutations} from './LexicalMutations';
import {commitPendingUpdates} from './LexicalUpdates';
import {FULL_RECONCILE} from './LexicalConstants';

export function $serializeRoot<
  SerializedNode: BaseSerializedNode,
  T: BaseSerializer<SerializedNode>,
>(editor: LexicalEditor): SerializedNode {
  const serializer = editor._serializer;
  if (serializer === null) {
    invariant(
      false,
      'Serializer not defined. You can pass a new serializer via EditorConfig -> createEditor({ serializer })',
    );
  }
  return editor.getEditorState().read(() => {
    const serializedRoot = serializer.serialize($getRoot());
    if (serializedRoot === null) {
      invariant(false, 'Root serializer does not exist.');
    }
    return serializedRoot;
  });
}

export function $deserializeRoot<
  SerializedNode: BaseSerializedNode,
  T: BaseSerializer<SerializedNode>,
>(editor: LexicalEditor, json: SerializedNode): void {
  const serializer = editor._serializer;
  if (serializer === null) {
    invariant(
      false,
      'Serializer not defined. You can pass a new serializer via EditorConfig -> createEditor({ serializer })',
    );
  }
  flushRootMutations(editor);

  const pendingEditorState = createEmptyEditorState();
  editor._pendingEditorState = pendingEditorState;
  pendingEditorState._flushSync = true;
  editor._dirtyType = FULL_RECONCILE;
  editor._compositionKey = null;
  editor.update(() => {
    // No need .deserialize already does that
    // $getRoot().markDirty(); // Create pendingEditorState
    const rootNode = serializer.deserialize(json);
    if (!$isRootNode(rootNode)) {
      invariant(false, 'Expected RootNode to lead the serialized object.');
    }
    editor._pendingEditorState._nodeMap.set('root', rootNode);

    const pendingEditorState = editor._pendingEditorState;
  });
}
