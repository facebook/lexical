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
  $serializeLineBreakNode,
  $serializeParagraphNode,
  $serializeRootNode,
  $serializeTextNode,
  $getRoot,
  $isTextNode,
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
  | SerializedParagraphNode<LexicalSerializedNode>;

export type Foo = LexicalSerializedNode | SerializedLineBreakNode;

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
      return $deserializeTextNode(json);
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

class FooSerializer extends LexicalSerializer<Foo> {}

function deserialize(json: LexicalSerializedNode): null | LexicalNode {
  //
}

function fooDeserialize(json: Foo): null | LexicalNode {
  if (json.type === 'linebreak') {
  } else {
    deserialize(json);
  }
}

// createSerializer([
//   'text': {serialize: $serializeTextNode, deserialize:  $deserializeTextNode}

// ])

type LexicalNodeType2<Type> = $ReadOnly<{
  type: Type,
  ...
}>;

export type SerializedXNode = $ReadOnly<{
  // children: Array<SerializedNode>,
  direction: 'ltr' | 'rtl' | null,
  format: number,
  indent: number,
  type: 'x',
}>;

export type SerializedYNode = $ReadOnly<{
  // children: Array<SerializedNode>,
  z: number,
  format: number,
  indent: number,
  type: 'y',
}>;

export type XYNodes = SerializedXNode | SerializedYNode;

export function $serializeXNode(node: LexicalNode): SerializedXNode {
  // const latest = node.getLatest();
  // return {
  //   content: node.getTextContent(),
  //   detail: latest.__detail,
  //   format: node.getFormat(),
  //   mode: latest.__mode,
  //   style: node.getStyle(),
  //   type: 'text',
  // };
}

export function $deserializeXNode(json: SerializedXNode<'x'>): LexicalNode {
  // const textNode = $createTextNode(json.content);
  // textNode.setFormat(json.format);
  // textNode.setStyle(json.style);
  // textNode.__mode = json.mode;
  // textNode.__detail = json.detail;
  // return textNode;
}

class Serializer<K> {
  // : LexicalNodeType2<Type>
  add<Type: string, TheSerializedNode: SerializedXNode>(
    type: Type,
    serializeFn: (node: LexicalNode) => TheSerializedNode,
    deserializeFn: (json: TheSerializedNode) => null | LexicalNode,
    zz: (K) => null | SerializedXNode,
  ) {}
}

class Foo2Serializer extends Serializer<XYNodes> {}

new Foo2Serializer().add<'x', SerializedXNode>(
  'x',
  (node) => {
    if (!$isTextNode(node)) {
      throw new Error('bad');
    }
    return $serializeXNode(node);
  },
  (json): null | LexicalNode => {
    return $deserializeXNode(json);
  },
  (serializedNode: XYNodes): null | SerializedXNode => {
    if (serializedNode.type === 'x') {
      return serializedNode;
    } else {
      return null;
    }
  },
);
