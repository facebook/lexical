/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { EditorConfig, LexicalEditor } from './LexicalEditor';
import type { RangeSelection } from './LexicalSelection';
import { ElementNode } from '.';
export declare type NodeMap = Map<NodeKey, LexicalNode>;
export declare type SerializedLexicalNode = {
    type: string;
    version: number;
};
export declare function removeNode(nodeToRemove: LexicalNode, restoreSelection: boolean, preserveEmptyParent?: boolean): void;
export declare function $getNodeByKeyOrThrow<N extends LexicalNode>(key: NodeKey): N;
export declare type DOMConversion = {
    conversion: DOMConversionFn;
    priority: 0 | 1 | 2 | 3 | 4;
};
export declare type DOMConversionFn = (element: Node, parent?: Node) => DOMConversionOutput;
export declare type DOMChildConversion = (lexicalNode: LexicalNode, parentLexicalNode: LexicalNode | null) => LexicalNode | null | void;
export declare type DOMConversionMap = Record<NodeName, (node: Node) => DOMConversion | null>;
declare type NodeName = string;
export declare type DOMConversionOutput = {
    after?: (childLexicalNodes: Array<LexicalNode>) => Array<LexicalNode>;
    forChild?: DOMChildConversion;
    node: LexicalNode | null;
};
export declare type DOMExportOutput = {
    after?: (generatedElement: HTMLElement | null | undefined) => HTMLElement | null | undefined;
    element: HTMLElement | null;
};
export declare type NodeKey = string;
export declare class LexicalNode {
    [x: string]: any;
    __type: string;
    __key: NodeKey;
    __parent: null | NodeKey;
    static getType(): string;
    static clone(_data: unknown): LexicalNode;
    constructor(key?: NodeKey);
    getType(): string;
    isAttached(): boolean;
    isSelected(): boolean;
    getKey(): NodeKey;
    getIndexWithinParent(): number;
    getParent<T extends ElementNode>(): T | null;
    getParentOrThrow<T extends ElementNode>(): T;
    getTopLevelElement(): ElementNode | this | null;
    getTopLevelElementOrThrow(): ElementNode | this;
    getParents<T extends ElementNode>(): Array<T>;
    getParentKeys(): Array<NodeKey>;
    getPreviousSibling<T extends LexicalNode>(): T | null;
    getPreviousSiblings<T extends LexicalNode>(): Array<T>;
    getNextSibling<T extends LexicalNode>(): T | null;
    getNextSiblings<T extends LexicalNode>(): Array<T>;
    getCommonAncestor<T extends ElementNode = ElementNode>(node: LexicalNode): T | null;
    is(object: LexicalNode | null | undefined): boolean;
    isBefore(targetNode: LexicalNode): boolean;
    isParentOf(targetNode: LexicalNode): boolean;
    getNodesBetween(targetNode: LexicalNode): Array<LexicalNode>;
    isDirty(): boolean;
    getLatest(): this;
    getWritable(): this;
    getTextContent(_includeInert?: boolean, _includeDirectionless?: false): string;
    getTextContentSize(includeInert?: boolean, includeDirectionless?: false): number;
    createDOM(_config: EditorConfig, _editor: LexicalEditor): HTMLElement;
    updateDOM(_prevNode: unknown, _dom: HTMLElement, _config: EditorConfig): boolean;
    exportDOM(editor: LexicalEditor): DOMExportOutput;
    static importDOM(): DOMConversionMap | null;
    exportJSON(): SerializedLexicalNode;
    static importJSON(_serializedNode: SerializedLexicalNode): LexicalNode;
    remove(preserveEmptyParent?: boolean): void;
    replace<N extends LexicalNode>(replaceWith: N): N;
    insertAfter(nodeToInsert: LexicalNode): LexicalNode;
    insertBefore(nodeToInsert: LexicalNode): LexicalNode;
    selectPrevious(anchorOffset?: number, focusOffset?: number): RangeSelection;
    selectNext(anchorOffset?: number, focusOffset?: number): RangeSelection;
    markDirty(): void;
}
export {};
