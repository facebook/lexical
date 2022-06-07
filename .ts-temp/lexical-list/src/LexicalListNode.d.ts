/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */
import type { Spread } from 'lexical';
import { DOMConversionMap, EditorConfig, ElementNode, LexicalEditor, LexicalNode, NodeKey, SerializedElementNode } from 'lexical';
export declare type SerializedListNode = Spread<{
    listType: ListType;
    start: number;
    tag: ListNodeTagType;
    type: 'list';
    version: 1;
}, SerializedElementNode>;
export declare type ListType = 'number' | 'bullet' | 'check';
export declare type ListNodeTagType = 'ul' | 'ol';
export declare class ListNode extends ElementNode {
    __tag: ListNodeTagType;
    __start: number;
    __listType: ListType;
    static getType(): string;
    static clone(node: ListNode): ListNode;
    constructor(listType: ListType, start: number, key?: NodeKey);
    getTag(): ListNodeTagType;
    getListType(): ListType;
    getStart(): number;
    createDOM(config: EditorConfig, _editor?: LexicalEditor): HTMLElement;
    updateDOM(prevNode: ListNode, dom: HTMLElement, config: EditorConfig): boolean;
    static importDOM(): DOMConversionMap | null;
    static importJSON(serializedNode: SerializedListNode): ListNode;
    exportJSON(): SerializedListNode;
    canBeEmpty(): false;
    canIndent(): false;
    append(...nodesToAppend: LexicalNode[]): this;
    extractWithChild(child: LexicalNode): boolean;
}
export declare function $createListNode(listType: ListType, start?: number): ListNode;
export declare function $isListNode(node: LexicalNode | null | undefined): node is ListNode;
