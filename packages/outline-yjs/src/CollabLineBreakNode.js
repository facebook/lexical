/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LineBreakNode, NodeKey} from 'outline';
import type {CollabBlockNode} from './CollabBlockNode';
import type {Map as YMap} from 'yjs';

import {isLineBreakNode, getNodeByKey} from 'outline';

export class CollabLineBreakNode {
  _map: YMap;
  _key: NodeKey;
  _parent: CollabBlockNode;
  _type: 'linebreak';

  constructor(map: YMap, parent: CollabBlockNode) {
    this._key = '';
    this._map = map;
    this._parent = parent;
    this._type = 'linebreak';
  }

  getNode(): null | LineBreakNode {
    const node = getNodeByKey(this._key);
    return isLineBreakNode(node) ? node : null;
  }

  getKey(): NodeKey {
    return this._key;
  }

  getSharedType(): YMap {
    return this._map;
  }

  getType(): string {
    return this._type;
  }

  getSize(): number {
    return 1;
  }

  getOffset(): number {
    const collabBlockNode = this._parent;
    return collabBlockNode.getChildOffset(this);
  }
}

export function createCollabLineBreakNode(
  map: YMap,
  parent: CollabBlockNode,
): CollabLineBreakNode {
  const collabNode = new CollabLineBreakNode(map, parent);
  // $FlowFixMe: internal field
  map._collabNode = collabNode;
  return collabNode;
}
