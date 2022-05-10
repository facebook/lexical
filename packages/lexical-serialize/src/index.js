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
import invariant from 'shared/invariant';

type BaseSerializedNode = $ReadOnly<{
  type: string,
  ...
}>;

type SNX = BaseSerializedNode &
  $ReadOnly<{
    foo: string,
  }>;

// Users can extend this class and override/delegate to the methods
export class BaseSerializer<SerializedNode: BaseSerializedNode> {
  deserialize(json: SerializedNode): null | LexicalNode {
    if (json.type === 'root') {
      return $deserializeRootNode(json, this.deserialize);
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
      return $serializeRootNode<DefaultBlockNodes>(node, this.serialize);
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

export function $serializeRoot<T: BaseSerializer>(serializer: T): string {
  return serializer.serialize($getRoot());
}

export function $deserializeRoot<T: BaseSerializer>(
  serializer: T,
  json: string,
): void {
  const rootNode = serializer.deserialize(json);
  if (!$isRootNode(rootNode)) {
    invariant(false, 'Expected RootNode');
  }
  $getRoot().replace(rootNode);
}
