/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {BaseSerializer, BaseSerializedNode} from '@lexical/serialize';
import type {LexicalNode} from './LexicalNode';
import type {EditorState} from './LexicalEditorState';
import type {LexicalEditor} from './LexicalEditor';

import {removeNode} from './LexicalNode';
import {$getRoot, $isRootNode} from 'lexical';
import invariant from 'shared/invariant';
import {createEmptyEditorState} from './LexicalEditorState';
import {flushRootMutations} from './LexicalMutations';
import {commitPendingUpdates, getActiveEditor} from './LexicalUpdates';
import {FULL_RECONCILE} from './LexicalConstants';
import type {SerializedRootNode} from './nodes/LexicalRootNode';

export function getEditorSerializerOrThrow(
  editor: LexicalEditor,
): BaseSerializer<BaseSerializedNode> {
  const serializer = editor._serializer;
  if (serializer === null) {
    invariant(
      false,
      'Serializer not defined. You can pass a new serializer via EditorConfig -> createEditor({ serializer })',
    );
  }
  return serializer;
}

export function $getSerializerOrThrow(): BaseSerializer<BaseSerializedNode> {
  const editor = getActiveEditor();
  return getEditorSerializerOrThrow(editor);
}

export function $serializeNode(
  editor: LexicalEditor,
  node: LexicalNode,
  deep: boolean,
): null | BaseSerializedNode {
  const serializer = $getSerializerOrThrow();
  return serializer.serialize(node, deep);
}

export function $deserializeNode<SerializedNode: BaseSerializedNode>(
  // $FlowFixMe[unclear-type]
  json: Object | SerializedNode,
  deep: boolean,
): null | LexicalNode {
  const serializedNode: SerializedNode = json;
  const serializer = $getSerializerOrThrow();
  return serializer.deserialize(serializedNode, deep);
}

export function serializeEditorState<SerializedNode: BaseSerializedNode>(
  editor: LexicalEditor,
  editorState: EditorState,
): SerializedRootNode<SerializedNode> {
  const serializer = getEditorSerializerOrThrow(editor);
  return editorState.read(() => {
    // $FlowFixMe TODO we can potentially leverage inheritance to resolve this
    const serializedRoot: SerializedRootNode = serializer.serialize($getRoot());
    return serializedRoot;
  });
}

export function deserializeEditorState<SerializedNode: BaseSerializedNode>(
  editor: LexicalEditor,
  // $FlowFixMe[unclear-type]
  json: Object | SerializedRootNode<SerializedNode> | BaseSerializedNode,
): EditorState {
  // $FlowFixMe Refine type
  const serializedRootNode: SerializedRootNode<SerializedNode> = json;
  const previousPendingEditorState = editor._pendingEditorState;
  const pendingEditorState = createEmptyEditorState();
  editor._pendingEditorState = pendingEditorState;
  editor.update(() => {
    // No need .deserialize already does that
    // $getRoot().markDirty(); // Create pendingEditorState
    const serializer = $getSerializerOrThrow();
    const rootNode = serializer.deserialize(serializedRootNode, true);
    if (rootNode === null) {
      invariant(false, 'Expected RootNode to lead the deserialization.');
    }
    pendingEditorState._nodeMap.set('root', rootNode);
  });
  editor._pendingEditorState = previousPendingEditorState;
  return pendingEditorState;
}

// export function $serializeRoot<
//   SerializedNode: BaseSerializedNode,
//   T: BaseSerializer<SerializedNode>,
// >(editor: LexicalEditor): SerializedNode {
//   const serializer = editor._serializer;
//   if (serializer === null) {
//     invariant(
//       false,
//       'Serializer not defined. You can pass a new serializer via EditorConfig -> createEditor({ serializer })',
//     );
//   }
//   return editor.getEditorState().read(() => {
//     const serializedRoot = serializer.serialize($getRoot());
//     if (serializedRoot === null) {
//       invariant(false, 'Root serializer does not exist.');
//     }
//     return serializedRoot;
//   });
// }

// export function $deserializeRoot<
//   SerializedNode: BaseSerializedNode,
//   T: BaseSerializer<SerializedNode>,
// >(editor: LexicalEditor, json: SerializedNode): void {
//   const serializer = editor._serializer;
//   if (serializer === null) {
//     invariant(
//       false,
//       'Serializer not defined. You can pass a new serializer via EditorConfig -> createEditor({ serializer })',
//     );
//   }
//   flushRootMutations(editor);

//   const pendingEditorState = createEmptyEditorState();
//   editor._pendingEditorState = pendingEditorState;
//   pendingEditorState._flushSync = true;
//   editor._dirtyType = FULL_RECONCILE;
//   editor._compositionKey = null;
//   editor.update(() => {
//     // No need .deserialize already does that
//     // $getRoot().markDirty(); // Create pendingEditorState
//     const rootNode = serializer.deserialize(json);
//     if (!$isRootNode(rootNode)) {
//       invariant(false, 'Expected RootNode to lead the serialized object.');
//     }
//     editor._pendingEditorState._nodeMap.set('root', rootNode);

//     const pendingEditorState = editor._pendingEditorState;
//   });
// }
