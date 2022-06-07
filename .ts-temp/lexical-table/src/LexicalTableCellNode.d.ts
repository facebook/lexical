/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { DOMConversionMap, DOMConversionOutput, DOMExportOutput, EditorConfig, LexicalEditor, LexicalNode, NodeKey, SerializedGridCellNode, Spread } from 'lexical';
import { GridCellNode } from 'lexical';
export declare const TableCellHeaderStates: {
    BOTH: number;
    COLUMN: number;
    NO_STATUS: number;
    ROW: number;
};
export declare type TableCellHeaderState = typeof TableCellHeaderStates[keyof typeof TableCellHeaderStates];
export declare type SerializedTableCellNode = Spread<{
    headerState: TableCellHeaderState;
    type: 'tablecell';
    width: number;
}, SerializedGridCellNode>;
export declare class TableCellNode extends GridCellNode {
    __headerState: TableCellHeaderState;
    __width: number;
    static getType(): 'tablecell';
    static clone(node: TableCellNode): TableCellNode;
    static importDOM(): DOMConversionMap | null;
    static importJSON(serializedNode: SerializedTableCellNode): TableCellNode;
    constructor(headerState?: number, colSpan?: number, width?: number, key?: NodeKey);
    createDOM(config: EditorConfig): HTMLElement;
    exportDOM(editor: LexicalEditor): DOMExportOutput;
    exportJSON(): SerializedTableCellNode;
    getTag(): string;
    setHeaderStyles(headerState: TableCellHeaderState): TableCellHeaderState;
    getHeaderStyles(): TableCellHeaderState;
    setWidth(width: number): number;
    getWidth(): number;
    toggleHeaderStyle(headerStateToToggle: TableCellHeaderState): TableCellNode;
    hasHeaderState(headerState: TableCellHeaderState): boolean;
    hasHeader(): boolean;
    updateDOM(prevNode: TableCellNode): boolean;
    collapseAtStart(): true;
    canBeEmpty(): false;
    canIndent(): false;
}
export declare function convertTableCellNodeElement(domNode: Node): DOMConversionOutput;
export declare function $createTableCellNode(headerState: TableCellHeaderState, colSpan?: number, width?: number): TableCellNode;
export declare function $isTableCellNode(node: LexicalNode | null | undefined): node is TableCellNode;
