/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { EditorConfig, LexicalNode, LineBreakNode, NodeKey, SerializedTextNode, Spread, TabNode } from 'lexical';
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
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-cpp';
import { ElementNode, TextNode } from 'lexical';
export declare const DEFAULT_CODE_LANGUAGE = "javascript";
type SerializedCodeHighlightNode = Spread<{
    highlightType: string | null | undefined;
}, SerializedTextNode>;
export declare const CODE_LANGUAGE_FRIENDLY_NAME_MAP: Record<string, string>;
export declare const CODE_LANGUAGE_MAP: Record<string, string>;
export declare function normalizeCodeLang(lang: string): string;
export declare function getLanguageFriendlyName(lang: string): string;
export declare const getDefaultCodeLanguage: () => string;
export declare const getCodeLanguages: () => Array<string>;
/** @noInheritDoc */
export declare class CodeHighlightNode extends TextNode {
    /** @internal */
    __highlightType: string | null | undefined;
    constructor(text: string, highlightType?: string | null | undefined, key?: NodeKey);
    static getType(): string;
    static clone(node: CodeHighlightNode): CodeHighlightNode;
    getHighlightType(): string | null | undefined;
    createDOM(config: EditorConfig): HTMLElement;
    updateDOM(prevNode: CodeHighlightNode, dom: HTMLElement, config: EditorConfig): boolean;
    static importJSON(serializedNode: SerializedCodeHighlightNode): CodeHighlightNode;
    exportJSON(): SerializedCodeHighlightNode;
    setFormat(format: number): this;
    isParentRequired(): true;
    createParentElementNode(): ElementNode;
}
export declare function $createCodeHighlightNode(text: string, highlightType?: string | null | undefined): CodeHighlightNode;
export declare function $isCodeHighlightNode(node: LexicalNode | CodeHighlightNode | null | undefined): node is CodeHighlightNode;
export declare function getFirstCodeNodeOfLine(anchor: CodeHighlightNode | TabNode | LineBreakNode): null | CodeHighlightNode | TabNode | LineBreakNode;
export declare function getLastCodeNodeOfLine(anchor: CodeHighlightNode | TabNode | LineBreakNode): CodeHighlightNode | TabNode | LineBreakNode;
export {};
