/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalNode, NodeKey, SerializedElementNode} from 'lexical';

import {Spread} from 'libdefs/globals';

import {ElementNode} from './LexicalElementNode';

export type SerializedGridCellNode = Spread<
  {
    colSpan: number;
  },
  SerializedElementNode
>;

export class GridCellNode extends ElementNode {
  __colSpan: number;

  constructor(colSpan: number, key?: NodeKey) {
    super(key);
    this.__colSpan = colSpan;
  }

  exportJSON(): SerializedGridCellNode {
    return {
      ...super.exportJSON(),
      colSpan: this.__colSpan,
    };
  }
}

export function $isGridCellNode(
  node: GridCellNode | LexicalNode | null | undefined,
): node is GridCellNode {
  return node instanceof GridCellNode;
}
