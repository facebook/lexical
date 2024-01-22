/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  LexicalNode,
  NodeKey,
  SerializedElementNode,
  Spread,
} from 'lexical';

import {ElementNode} from 'lexical';

export type SerializedGridCellNode = Spread<
  {
    colSpan?: number;
    rowSpan?: number;
  },
  SerializedElementNode
>;

/** @noInheritDoc */
export class GridCellNode extends ElementNode {
  /** @internal */
  __colSpan: number;
  __rowSpan: number;

  constructor(colSpan: number, key?: NodeKey) {
    super(key);
    this.__colSpan = colSpan;
    this.__rowSpan = 1;
  }

  exportJSON(): SerializedGridCellNode {
    return {
      ...super.exportJSON(),
      colSpan: this.__colSpan,
      rowSpan: this.__rowSpan,
    };
  }

  getColSpan(): number {
    return this.__colSpan;
  }

  setColSpan(colSpan: number): this {
    this.getWritable().__colSpan = colSpan;
    return this;
  }

  getRowSpan(): number {
    return this.__rowSpan;
  }

  setRowSpan(rowSpan: number): this {
    this.getWritable().__rowSpan = rowSpan;
    return this;
  }
}

export function $isGridCellNode(
  node: GridCellNode | LexicalNode | null | undefined,
): node is GridCellNode {
  return node instanceof GridCellNode;
}
