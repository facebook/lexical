/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { DOMConversionMap, EditorConfig, LexicalEditor, LexicalNode, NodeKey, ParagraphNode, RangeSelection, SerializedElementNode, SerializedTextNode, Spread } from 'lexical';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-objectivec';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-swift';
import { ElementNode, TextNode } from 'lexical';
declare type SerializedCodeNode = Spread<{
    language: string | null | undefined;
    type: 'code';
    version: 1;
}, SerializedElementNode>;
declare type SerializedCodeHighlightNode = Spread<{
    highlightType: string | null | undefined;
    type: 'code-highlight';
    version: 1;
}, SerializedTextNode>;
export declare const getDefaultCodeLanguage: () => string;
export declare const getCodeLanguages: () => Array<string>;
export declare class CodeHighlightNode extends TextNode {
    __highlightType: string | null | undefined;
    constructor(text: string, highlightType?: string, key?: NodeKey);
    static getType(): string;
    static clone(node: CodeHighlightNode): CodeHighlightNode;
    getHighlightType(): string | null | undefined;
    createDOM(config: EditorConfig): HTMLElement;
    updateDOM(prevNode: CodeHighlightNode, dom: HTMLElement, config: EditorConfig): boolean;
    static importJSON(serializedNode: SerializedCodeHighlightNode): CodeHighlightNode;
    exportJSON(): SerializedCodeHighlightNode;
    setFormat(format: number): this;
}
export declare function $createCodeHighlightNode(text: string, highlightType?: string): CodeHighlightNode;
export declare function $isCodeHighlightNode(node: LexicalNode | CodeHighlightNode | null | undefined): node is CodeHighlightNode;
export declare class CodeNode extends ElementNode {
    __language: string | null | undefined;
    static getType(): string;
    static clone(node: CodeNode): CodeNode;
    constructor(language?: string | null | undefined, key?: NodeKey);
    createDOM(config: EditorConfig): HTMLElement;
    updateDOM(prevNode: CodeNode, dom: HTMLElement): boolean;
    static importDOM(): DOMConversionMap | null;
    static importJSON(serializedNode: SerializedCodeNode): CodeNode;
    exportJSON(): SerializedCodeNode;
    insertNewAfter(selection: RangeSelection): null | ParagraphNode | CodeHighlightNode;
    canInsertTab(): boolean;
    canIndent(): false;
    collapseAtStart(): true;
    setLanguage(language: string): void;
    getLanguage(): string | null | undefined;
}
export declare function $createCodeNode(language?: string): CodeNode;
export declare function $isCodeNode(node: LexicalNode | null | undefined): node is CodeNode;
export declare function getFirstCodeHighlightNodeOfLine(anchor: LexicalNode): CodeHighlightNode | null | undefined;
export declare function getLastCodeHighlightNodeOfLine(anchor: LexicalNode): CodeHighlightNode | null | undefined;
export declare function getStartOfCodeInLine(anchor: LexicalNode): {
    node: TextNode | null;
    offset: number;
};
export declare function getEndOfCodeInLine(anchor: LexicalNode): {
    node: TextNode | null;
    offset: number;
};
export declare function registerCodeHighlighting(editor: LexicalEditor): () => void;
export {};
