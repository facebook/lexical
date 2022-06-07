/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { DOMConversionMap, EditorConfig, GridSelection, LexicalNode, NodeKey, NodeSelection, ParagraphNode, RangeSelection, SerializedElementNode, Spread } from 'lexical';
import { ElementNode } from 'lexical';
export declare type SerializedListItemNode = Spread<{
    checked: boolean;
    type: 'listitem';
    value: number;
    version: 1;
}, SerializedElementNode>;
export declare class ListItemNode extends ElementNode {
    __value: number;
    __checked: boolean;
    static getType(): string;
    static clone(node: ListItemNode): ListItemNode;
    constructor(value?: number, checked?: boolean, key?: NodeKey);
    createDOM(config: EditorConfig): HTMLElement;
    updateDOM(prevNode: ListItemNode, dom: HTMLElement, config: EditorConfig): boolean;
    static importDOM(): DOMConversionMap | null;
    static importJSON(serializedNode: SerializedListItemNode): ListItemNode;
    exportJSON(): SerializedListItemNode;
    append(...nodes: LexicalNode[]): this;
    replace<N extends LexicalNode>(replaceWithNode: N): N;
    insertAfter(node: LexicalNode): LexicalNode;
    remove(preserveEmptyParent?: boolean): void;
    insertNewAfter(): ListItemNode | ParagraphNode;
    collapseAtStart(selection: RangeSelection): true;
    getValue(): number;
    setValue(value: number): void;
    getChecked(): boolean;
    setChecked(checked: boolean): void;
    toggleChecked(): void;
    getIndent(): number;
    setIndent(indent: number): this;
    canIndent(): false;
    insertBefore(nodeToInsert: LexicalNode): LexicalNode;
    canInsertAfter(node: LexicalNode): boolean;
    canReplaceWith(replacement: LexicalNode): boolean;
    canMergeWith(node: LexicalNode): boolean;
    extractWithChild(child: LexicalNode, selection: RangeSelection | NodeSelection | GridSelection): boolean;
}
export declare function $createListItemNode(checked?: boolean): ListItemNode;
export declare function $isListItemNode(node: LexicalNode | null | undefined): node is ListItemNode;
