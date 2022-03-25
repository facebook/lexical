/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalNode, NodeKey} from 'lexical';

import {ElementNode} from './LexicalElementNode';

export class GridCellNode extends ElementNode {
  __colSpan: number;

  constructor(colSpan: number, key?: NodeKey) {
    super(key);
  }
}

export function $isGridCellNode(node: ?LexicalNode): boolean %checks {
  return node instanceof GridCellNode;
}
