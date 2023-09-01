/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { LexicalEditor, LineBreakNode } from 'lexical';
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
import { TabNode } from 'lexical';
import { CodeHighlightNode } from './CodeHighlightNode';
type TokenContent = string | Token | (string | Token)[];
export interface Token {
    type: string;
    content: TokenContent;
}
export interface Tokenizer {
    defaultLanguage: string;
    tokenize(code: string, language?: string): (string | Token)[];
}
export declare const PrismTokenizer: Tokenizer;
export declare function getStartOfCodeInLine(anchor: CodeHighlightNode | TabNode, offset: number): null | {
    node: CodeHighlightNode | TabNode | LineBreakNode;
    offset: number;
};
export declare function getEndOfCodeInLine(anchor: CodeHighlightNode | TabNode): CodeHighlightNode | TabNode;
export declare function registerCodeHighlighting(editor: LexicalEditor, tokenizer?: Tokenizer): () => void;
export {};
