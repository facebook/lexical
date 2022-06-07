/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { Spread } from 'lexical';
import { DOMConversionMap, DOMConversionOutput, EditorConfig, GridRowNode, LexicalNode, NodeKey, SerializedElementNode } from 'lexical';
export declare type SerializedTableRowNode = Spread<{
    height: number;
    type: 'tablerow';
    version: 1;
}, SerializedElementNode>;
export declare class TableRowNode extends GridRowNode {
    __height: number;
    static getType(): 'tablerow';
    static clone(node: TableRowNode): TableRowNode;
    static importDOM(): DOMConversionMap | null;
    static importJSON(serializedNode: SerializedTableRowNode): TableRowNode;
    constructor(height?: number, key?: NodeKey);
    exportJSON(): SerializedElementNode;
    createDOM(config: EditorConfig): HTMLElement;
    setHeight(height: number): number;
    getHeight(): number;
    updateDOM(prevNode: TableRowNode): boolean;
    canBeEmpty(): false;
    canIndent(): false;
}
export declare function convertTableRowElement(domNode: Node): DOMConversionOutput;
export declare function $createTableRowNode(height?: number): TableRowNode;
export declare function $isTableRowNode(node: LexicalNode | null | undefined): node is TableRowNode;
