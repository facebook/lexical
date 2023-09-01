/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { LexicalNode, NodeKey, SerializedElementNode, Spread } from 'lexical';
import { ElementNode } from './LexicalElementNode';
export type SerializedGridCellNode = Spread<{
    colSpan?: number;
    rowSpan?: number;
}, SerializedElementNode>;
/** @noInheritDoc */
export declare class DEPRECATED_GridCellNode extends ElementNode {
    /** @internal */
    __colSpan: number;
    __rowSpan: number;
    constructor(colSpan: number, key?: NodeKey);
    exportJSON(): SerializedGridCellNode;
    getColSpan(): number;
    setColSpan(colSpan: number): this;
    getRowSpan(): number;
    setRowSpan(rowSpan: number): this;
}
export declare function DEPRECATED_$isGridCellNode(node: DEPRECATED_GridCellNode | LexicalNode | null | undefined): node is DEPRECATED_GridCellNode;
