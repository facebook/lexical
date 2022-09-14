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

import {ElementNode} from './LexicalElementNode';

export type SerializedGridCellNode = Spread<
  {
    colSpan: number;
  },
  SerializedElementNode
>;

/** @noInheritDoc */
export class DEPRECATED_GridCellNode extends ElementNode {
  /** @internal */
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

export function DEPRECATED_$isGridCellNode(
  node: DEPRECATED_GridCellNode | LexicalNode | null | undefined,
): node is DEPRECATED_GridCellNode {
  return node instanceof DEPRECATED_GridCellNode;
}
