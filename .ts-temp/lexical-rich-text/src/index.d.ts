/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { DOMConversionMap, EditorConfig, EditorState, LexicalEditor, LexicalNode, NodeKey, ParagraphNode, SerializedElementNode, Spread } from 'lexical';
import { ElementNode } from 'lexical';
export declare type InitialEditorStateType = null | string | EditorState | (() => void);
export declare type SerializedHeadingNode = Spread<{
    tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5';
    type: 'heading';
    version: 1;
}, SerializedElementNode>;
export declare type SerializedQuoteNode = Spread<{
    type: 'quote';
    version: 1;
}, SerializedElementNode>;
export declare class QuoteNode extends ElementNode {
    static getType(): string;
    static clone(node: QuoteNode): QuoteNode;
    constructor(key?: NodeKey);
    createDOM(config: EditorConfig): HTMLElement;
    updateDOM(prevNode: QuoteNode, dom: HTMLElement): boolean;
    static importDOM(): DOMConversionMap | null;
    static importJSON(serializedNode: SerializedQuoteNode): QuoteNode;
    exportJSON(): SerializedElementNode;
    insertNewAfter(): ParagraphNode;
    collapseAtStart(): true;
}
export declare function $createQuoteNode(): QuoteNode;
export declare function $isQuoteNode(node: LexicalNode | null | undefined): node is QuoteNode;
export declare type HeadingTagType = 'h1' | 'h2' | 'h3' | 'h4' | 'h5';
export declare class HeadingNode extends ElementNode {
    __tag: HeadingTagType;
    static getType(): string;
    static clone(node: HeadingNode): HeadingNode;
    constructor(tag: HeadingTagType, key?: NodeKey);
    getTag(): HeadingTagType;
    createDOM(config: EditorConfig): HTMLElement;
    updateDOM(prevNode: HeadingNode, dom: HTMLElement): boolean;
    static importDOM(): DOMConversionMap | null;
    static importJSON(serializedNode: SerializedHeadingNode): HeadingNode;
    exportJSON(): SerializedHeadingNode;
    insertNewAfter(): ParagraphNode;
    collapseAtStart(): true;
    extractWithChild(): boolean;
}
export declare function $createHeadingNode(headingTag: HeadingTagType): HeadingNode;
export declare function $isHeadingNode(node: LexicalNode | null | undefined): node is HeadingNode;
export declare function registerRichText(editor: LexicalEditor, initialEditorState?: InitialEditorStateType): () => void;
