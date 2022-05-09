/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalNode} from 'lexical';

export default class Serializer<SerializedNode> {
  deserialize(json: SerializedNode, deep: boolean): null | LexicalNode {
    // TODO
    return null;
  }
  serialize(node: LexicalNode, deep: boolean): null | SerializedNode {
    // TODO
    return null;
  }
}
