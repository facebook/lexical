/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { ElementNode, Klass, LexicalNode, TextFormatType, TextNode } from 'lexical';
export type Transformer = ElementTransformer | TextFormatTransformer | TextMatchTransformer;
export type ElementTransformer = {
    dependencies: Array<Klass<LexicalNode>>;
    export: (node: LexicalNode, traverseChildren: (node: ElementNode) => string) => string | null;
    getNumberOfLines?: (lines: Array<string>, startLineIndex: number) => number;
    getChildrenFromLines?: (lines: Array<string>) => Array<LexicalNode>;
    regExp: RegExp;
    /**
     * using for check close mark
     * ``` of code block
     * ::: of tip block
     */
    closeRegExp?: RegExp;
    replace: (parentNode: ElementNode, children: Array<LexicalNode>, match: Array<string>, isImport: boolean) => void;
    type: 'element';
};
export type TextFormatTransformer = Readonly<{
    format: ReadonlyArray<TextFormatType>;
    tag: string;
    intraword?: boolean;
    type: 'text-format';
}>;
export type TextMatchTransformer = Readonly<{
    dependencies: Array<Klass<LexicalNode>>;
    export: (node: LexicalNode, exportChildren: (node: ElementNode) => string, exportFormat: (node: TextNode, textContent: string) => string) => string | null;
    importRegExp: RegExp;
    regExp: RegExp;
    replace: (node: TextNode, match: RegExpMatchArray) => void;
    trigger: string;
    type: 'text-match';
}>;
export declare const createBlockNode: (createNode: (match: Array<string>) => ElementNode) => ElementTransformer['replace'];
export declare const HEADING: ElementTransformer;
export declare const QUOTE: ElementTransformer;
export declare const CODE: ElementTransformer;
export declare const UNORDERED_LIST: ElementTransformer;
export declare const CHECK_LIST: ElementTransformer;
export declare const ORDERED_LIST: ElementTransformer;
export declare const INLINE_CODE: TextFormatTransformer;
export declare const HIGHLIGHT: TextFormatTransformer;
export declare const BOLD_ITALIC_STAR: TextFormatTransformer;
export declare const BOLD_ITALIC_UNDERSCORE: TextFormatTransformer;
export declare const BOLD_STAR: TextFormatTransformer;
export declare const BOLD_UNDERSCORE: TextFormatTransformer;
export declare const STRIKETHROUGH: TextFormatTransformer;
export declare const ITALIC_STAR: TextFormatTransformer;
export declare const ITALIC_UNDERSCORE: TextFormatTransformer;
export declare const LINK: TextMatchTransformer;
