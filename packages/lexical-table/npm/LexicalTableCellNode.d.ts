/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { DOMConversionMap, DOMConversionOutput, DOMExportOutput, EditorConfig, LexicalEditor, LexicalNode, NodeKey, SerializedGridCellNode, Spread } from 'lexical';
import { DEPRECATED_GridCellNode } from 'lexical';
export declare const TableCellHeaderStates: {
    BOTH: number;
    COLUMN: number;
    NO_STATUS: number;
    ROW: number;
};
export type TableCellHeaderState = typeof TableCellHeaderStates[keyof typeof TableCellHeaderStates];
export type SerializedTableCellNode = Spread<{
    headerState: TableCellHeaderState;
    width?: number;
    backgroundColor?: null | string;
}, SerializedGridCellNode>;
/** @noInheritDoc */
export declare class TableCellNode extends DEPRECATED_GridCellNode {
    /** @internal */
    __headerState: TableCellHeaderState;
    /** @internal */
    __width?: number;
    /** @internal */
    __backgroundColor: null | string;
    static getType(): string;
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
    setWidth(width: number): number | null | undefined;
    getWidth(): number | undefined;
    getBackgroundColor(): null | string;
    setBackgroundColor(newBackgroundColor: null | string): void;
    toggleHeaderStyle(headerStateToToggle: TableCellHeaderState): TableCellNode;
    hasHeaderState(headerState: TableCellHeaderState): boolean;
    hasHeader(): boolean;
    updateDOM(prevNode: TableCellNode): boolean;
    isShadowRoot(): boolean;
    collapseAtStart(): true;
    canBeEmpty(): false;
    canIndent(): false;
}
export declare function convertTableCellNodeElement(domNode: Node): DOMConversionOutput;
export declare function $createTableCellNode(headerState: TableCellHeaderState, colSpan?: number, width?: number): TableCellNode;
export declare function $isTableCellNode(node: LexicalNode | null | undefined): node is TableCellNode;
