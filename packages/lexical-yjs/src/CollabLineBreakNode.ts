/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {Binding} from '.';
import type {CollabElementNode} from './CollabElementNode';
import type {LineBreakNode, NodeKey} from 'lexical';
import type {Map as YMap} from 'yjs';

import {$getNodeByKey, $isLineBreakNode} from 'lexical';

export class CollabLineBreakNode {
  _map: YMap<unknown>;
  _key: NodeKey;
  _parent: CollabElementNode;
  _type: string;

  constructor(map: YMap<unknown>, parent: CollabElementNode, type?: string) {
    this._key = '';
    this._map = map;
    this._parent = parent;
    this._type = type || 'linebreak';
  }

  getNode(): null | LineBreakNode {
    const node = $getNodeByKey(this._key);
    return $isLineBreakNode(node) ? node : null;
  }

  getKey(): NodeKey {
    return this._key;
  }

  getSharedType(): YMap<unknown> {
    return this._map;
  }

  getType(): string {
    return this._type || 'linebreak';
  }

  getSize(): number {
    return 1;
  }

  getOffset(): number {
    const collabElementNode = this._parent;
    return collabElementNode.getChildOffset(this);
  }

  destroy(binding: Binding): void {
    const collabNodeMap = binding.collabNodeMap;
    if (collabNodeMap.get(this._key) === this) {
      collabNodeMap.delete(this._key);
    }
  }
}

export function $createCollabLineBreakNode(
  map: YMap<unknown>,
  parent: CollabElementNode,
  type?: string,
): CollabLineBreakNode {
  const collabNode = new CollabLineBreakNode(map, parent, type);
  map._collabNode = collabNode;
  return collabNode;
}
