/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalNode} from 'lexical';

export declare class Serializer<SerializedNode> {
  deserialize(json: SerializedNode, deep: boolean): null | LexicalNode;
  serialize(node: LexicalNode, deep: boolean): null | SerializedNode;
}
