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

export function $serializeRoot<
  SerializedNode: BaseSerializedNode,
  T: BaseSerializer<SerializedNode>,
>(editor: LexicalEditor, serializer: T): SerializedNode {
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
>(editor: LexicalEditor, serializer: T, json: SerializedNode): void {
  editor.update(() => {
    const rootNode = serializer.deserialize(json);
    if (!$isRootNode(rootNode)) {
      invariant(false, 'Expected RootNode to lead the serialized object.');
    }
    $getRoot().markDirty(); // Create pendingEditorState
    // $FlowFixMe
    editor._pendingEditorState._nodeMap['root'] = rootNode;

    const pendingEditorState = editor._pendingEditorState;
    if (pendingEditorState !== null) {
      pendingEditorState._flushSync = true;
    }
  });
}
