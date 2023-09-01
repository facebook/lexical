/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { TableCellNode } from './LexicalTableCellNode';
import type { Cell, Grid } from './LexicalTableSelection';
import type { DOMConversionMap, DOMConversionOutput, DOMExportOutput, EditorConfig, LexicalEditor, LexicalNode, NodeKey, SerializedElementNode } from 'lexical';
import { DEPRECATED_GridNode } from 'lexical';
export type SerializedTableNode = SerializedElementNode;
/** @noInheritDoc */
export declare class TableNode extends DEPRECATED_GridNode {
    /** @internal */
    __grid?: Grid;
    static getType(): string;
    static clone(node: TableNode): TableNode;
    static importDOM(): DOMConversionMap | null;
    static importJSON(_serializedNode: SerializedTableNode): TableNode;
    constructor(key?: NodeKey);
    exportJSON(): SerializedElementNode;
    createDOM(config: EditorConfig, editor?: LexicalEditor): HTMLElement;
    updateDOM(): boolean;
    exportDOM(editor: LexicalEditor): DOMExportOutput;
    canExtractContents(): false;
    canBeEmpty(): false;
    isShadowRoot(): boolean;
    getCordsFromCellNode(tableCellNode: TableCellNode, grid: Grid): {
        x: number;
        y: number;
    };
    getCellFromCords(x: number, y: number, grid: Grid): Cell | null;
    getCellFromCordsOrThrow(x: number, y: number, grid: Grid): Cell;
    getCellNodeFromCords(x: number, y: number, grid: Grid): TableCellNode | null;
    getCellNodeFromCordsOrThrow(x: number, y: number, grid: Grid): TableCellNode;
    canSelectBefore(): true;
    canIndent(): false;
}
export declare function $getElementGridForTableNode(editor: LexicalEditor, tableNode: TableNode): Grid;
export declare function convertTableElement(_domNode: Node): DOMConversionOutput;
export declare function $createTableNode(): TableNode;
export declare function $isTableNode(node: LexicalNode | null | undefined): node is TableNode;
