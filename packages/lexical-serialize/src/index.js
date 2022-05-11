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
import {$isElementNode} from 'lexical';
import type {
  SerializedLineBreakNode,
  SerializedParagraphNode,
  SerializedTextNode,
} from '../../lexical/flow/Lexical';

export type LexicalSerializedNode =
  | SerializedRootNode<LexicalSerializedNode>
  | SerializedTextNode
  | SerializedLineBreakNode
  | SerializedParagraphNode<LexicalSerializedNode>;

// Users can extend this class and override/delegate to the methods
// TODO prevent this class somehow from being used directly -> use editor config
export class LexicalSerializer<T: LexicalSerializedNode> {
  deserialize(json: T): null | LexicalNode {
    let node = null;
    if (json.type === 'root') {
      node = $deserializeRootNode(json, (json) => this.deserialize(json));
      return node;
    } else if (json.type === 'paragraph') {
      return $deserializeParagraphNode(json, (json) => this.deserialize(json));
    } else if (json.type === 'linebreak') {
      return $deserializeLineBreakNode(json);
    } else if (json.type === 'text') {
      // $FlowFixMe Refine type
      const textNodeJSON = (json: SerializedTextNode);
      return $deserializeTextNode(textNodeJSON);
    }
    // if ($isElementNode(node)) {
    //   this.deserialize();
    // }
    return null;
  }
  serialize(node: LexicalNode): null | SerializedNode {
    if ($isRootNode(node)) {
      return $serializeRootNode<DefaultBlockNodes>(node, (node: LexicalNode) =>
        this.serialize(node),
      );
    } else if ($isParagraphNode(node)) {
      return $serializeParagraphNode<DefaultLeafNodes>(
        node,
        (node: LexicalNode) => this.serialize(node),
      );
    } else if ($isLineBreakNode(node)) {
      return $serializeLineBreakNode(node);
    } else if ($isTextNode(node)) {
      return $serializeTextNode(node);
    }
    return null;
  }
}

// createSerializer([
//   'text': {serialize: $serializeTextNode, deserialize: () => $deserializeTextNode}
// ])
