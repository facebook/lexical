/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  DefaultBlockNodes,
  DefaultLeafNodes,
  DefaultSerializedNodes,
  LexicalNode,
  LexicalEditor,
  EditorState,
} from 'lexical';

import {
  $deserializeLineBreakNode,
  $deserializeParagraphNode,
  $deserializeRootNode,
  $deserializeTextNode,
  $isLineBreakNode,
  $isParagraphNode,
  $isRootNode,
  $isTextNode,
  $serializeLineBreakNode,
  $serializeParagraphNode,
  $serializeRootNode,
  $serializeTextNode,
  $getRoot,
} from 'lexical';

// Users can extend this class and override/delegate to the methods
// $FlowFixMe - serialized nodes can have any shape.
export class BaseSerializer<SerializedNode: any> {
  deserialize(
    json: SerializedNode | DefaultSerializedNodes,
  ): null | LexicalNode {
    if (json.type === 'root') {
      return $deserializeRootNode(json);
    } else if (json.type === 'paragraph') {
      return $deserializeParagraphNode(json);
    } else if (json.type === 'linebreak') {
      return $deserializeLineBreakNode(json);
    } else if (json.type === 'text') {
      return $deserializeTextNode(json);
    }
    return null;
  }
  serialize(node: LexicalNode): null | SerializedNode | DefaultSerializedNodes {
    if ($isRootNode(node)) {
      return $serializeRootNode<DefaultBlockNodes>(node);
    } else if ($isParagraphNode(node)) {
      return $serializeParagraphNode<DefaultLeafNodes>(node);
    } else if ($isLineBreakNode(node)) {
      return $serializeLineBreakNode(node);
    } else if ($isTextNode(node)) {
      return $serializeTextNode(node);
    }
    return null;
  }
}

export function jsonSerialize<T: BaseSerializer>(
  serializer: T,
  editorState: EditorState,
): string {
  return JSON.stringify(
    editorState.read(() => serializer.serialize($getRoot())),
  );
}

export function jsonDeserialize<T: BaseSerializer>(
  editor: LexicalEditor,
  serializer: T,
  json: string,
): EditorState {
  //
}
