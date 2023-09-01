/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { ElementTransformer, TextFormatTransformer, TextMatchTransformer, Transformer } from '@lexical/markdown';
import type { ElementNode, LexicalNode, TextFormatType } from 'lexical';
type MarkdownFormatKind = 'noTransformation' | 'paragraphH1' | 'paragraphH2' | 'paragraphH3' | 'paragraphH4' | 'paragraphH5' | 'paragraphH6' | 'paragraphBlockQuote' | 'paragraphUnorderedList' | 'paragraphOrderedList' | 'paragraphCodeBlock' | 'horizontalRule' | 'bold' | 'code' | 'italic' | 'underline' | 'strikethrough' | 'italic_bold' | 'strikethrough_italic' | 'strikethrough_bold' | 'strikethrough_italic_bold' | 'link';
type MarkdownCriteria = Readonly<{
    export?: (node: LexicalNode, traverseChildren: (elementNode: ElementNode) => string) => string | null;
    exportFormat?: TextFormatType;
    exportTag?: string;
    exportTagClose?: string;
    markdownFormatKind: MarkdownFormatKind | null | undefined;
    regEx: RegExp;
    regExForAutoFormatting: RegExp;
    requiresParagraphStart: boolean | null | undefined;
}>;
type MarkdownCriteriaArray = Array<MarkdownCriteria>;
export declare function getAllMarkdownCriteriaForParagraphs(): MarkdownCriteriaArray;
export declare function getAllMarkdownCriteriaForTextNodes(): MarkdownCriteriaArray;
export declare function indexBy<T>(list: Array<T>, callback: (arg0: T) => string): Readonly<Record<string, Array<T>>>;
export declare function transformersByType(transformers: Array<Transformer>): Readonly<{
    element: Array<ElementTransformer>;
    textFormat: Array<TextFormatTransformer>;
    textMatch: Array<TextMatchTransformer>;
}>;
export declare const PUNCTUATION_OR_SPACE: RegExp;
export {};
