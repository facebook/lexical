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
  SerializedRootNode,
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

export type BaseSerializedNode = $ReadOnly<{
  type: string,
  ...
}>;

// Users can extend this class and override/delegate to the methods
// TODO prevent this class somehow from being used directly -> use editor config
export class BaseSerializer<SerializedNode: BaseSerializedNode> {
  deserialize(json: SerializedNode): null | LexicalNode {
    if (json.type === 'root') {
      // $FlowFixMe Refine type
      const rootJSON = (json: SerializedRootNode<SerializedNode>);
      return $deserializeRootNode(rootJSON, (json) => this.deserialize(json));
    } else if (json.type === 'paragraph') {
      return $deserializeParagraphNode(json);
    } else if (json.type === 'linebreak') {
      return $deserializeLineBreakNode(json);
    } else if (json.type === 'text') {
      // $FlowFixMe Refine type
      return $deserializeTextNode(json);
    }
    return null;
  }
  serialize(node: LexicalNode): null | SerializedNode {
    if ($isRootNode(node)) {
      return $serializeRootNode<DefaultBlockNodes>(node, (node: LexicalNode) =>
        this.serialize(node),
      );
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
