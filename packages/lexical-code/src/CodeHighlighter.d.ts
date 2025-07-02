/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { LexicalEditor, LineBreakNode } from 'lexical';
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
export declare function $getStartOfCodeInLine(anchor: CodeHighlightNode | TabNode, offset: number): null | {
    node: CodeHighlightNode | TabNode | LineBreakNode;
    offset: number;
};
export declare function $getEndOfCodeInLine(anchor: CodeHighlightNode | TabNode): CodeHighlightNode | TabNode;
export declare function registerCodeHighlighting(editor: LexicalEditor, tokenizer?: Tokenizer): () => void;
export {};
//# sourceMappingURL=CodeHighlighter.d.ts.map