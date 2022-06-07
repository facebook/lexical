/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { LexicalNode, NodeKey, SerializedElementNode, Spread } from 'lexical';
import { ElementNode } from './LexicalElementNode';
export declare type SerializedGridCellNode = Spread<{
    colSpan: number;
}, SerializedElementNode>;
export declare class GridCellNode extends ElementNode {
    __colSpan: number;
    constructor(colSpan: number, key?: NodeKey);
    exportJSON(): SerializedGridCellNode;
}
export declare function $isGridCellNode(node: GridCellNode | LexicalNode | null | undefined): node is GridCellNode;
