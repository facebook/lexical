/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */
import type { TextNodeWithOffset } from '@lexical/text';
import type { DecoratorNode, ElementNode, LexicalEditor, LexicalNode, NodeKey, TextFormatType } from 'lexical';
export declare type AutoFormatTriggerState = Readonly<{
    anchorOffset: number;
    hasParentNode: boolean;
    isCodeBlock: boolean;
    isParentAListItemNode: boolean;
    isSelectionCollapsed: boolean;
    isSimpleText: boolean;
    nodeKey: NodeKey;
    textContent: string;
}>;
export declare type MarkdownFormatKind = 'noTransformation' | 'paragraphH1' | 'paragraphH2' | 'paragraphH3' | 'paragraphH4' | 'paragraphH5' | 'paragraphBlockQuote' | 'paragraphUnorderedList' | 'paragraphOrderedList' | 'paragraphCodeBlock' | 'horizontalRule' | 'bold' | 'code' | 'italic' | 'underline' | 'strikethrough' | 'italic_bold' | 'strikethrough_italic' | 'strikethrough_bold' | 'strikethrough_italic_bold' | 'link';
export declare type ScanningContext = {
    currentElementNode: null | ElementNode;
    editor: LexicalEditor;
    isAutoFormatting: boolean;
    isWithinCodeBlock: boolean;
    joinedText: string | null | undefined;
    markdownCriteria: MarkdownCriteria;
    patternMatchResults: PatternMatchResults;
    textNodeWithOffset: TextNodeWithOffset | null | undefined;
    triggerState: AutoFormatTriggerState | null | undefined;
};
export declare type MarkdownCriteria = Readonly<{
    export?: (node: LexicalNode, traverseChildren: (node: ElementNode) => string) => string | null;
    exportFormat?: TextFormatType;
    exportTag?: string;
    exportTagClose?: string;
    markdownFormatKind: MarkdownFormatKind | null | undefined;
    regEx: RegExp;
    regExForAutoFormatting: RegExp;
    requiresParagraphStart: boolean | null | undefined;
}>;
declare type CaptureGroupDetail = {
    offsetInParent: number;
    text: string;
};
export declare type PatternMatchResults = {
    regExCaptureGroups: Array<CaptureGroupDetail>;
};
export declare type MarkdownCriteriaWithPatternMatchResults = {
    markdownCriteria: null | MarkdownCriteria;
    patternMatchResults: null | PatternMatchResults;
};
export declare type MarkdownCriteriaArray = Array<MarkdownCriteria>;
export declare type AutoFormatTriggerKind = 'space_trigger' | 'codeBlock_trigger';
export declare type AutoFormatTrigger = {
    triggerKind: AutoFormatTriggerKind;
    triggerString: string;
};
export declare const triggers: Array<AutoFormatTrigger>;
export declare const allMarkdownCriteria: MarkdownCriteriaArray;
export declare function getAllTriggers(): Array<AutoFormatTrigger>;
export declare function getAllMarkdownCriteriaForParagraphs(): MarkdownCriteriaArray;
export declare function getAllMarkdownCriteriaForTextNodes(): MarkdownCriteriaArray;
export declare function getAllMarkdownCriteria(): MarkdownCriteriaArray;
export declare function getInitialScanningContext(editor: LexicalEditor, isAutoFormatting: boolean, textNodeWithOffset: null | TextNodeWithOffset, triggerState: null | AutoFormatTriggerState): ScanningContext;
export declare function resetScanningContext(scanningContext: ScanningContext): ScanningContext;
export declare function getCodeBlockCriteria(): MarkdownCriteria;
export declare function getPatternMatchResultsForCriteria(markdownCriteria: MarkdownCriteria, scanningContext: ScanningContext, parentElementNode: ElementNode): null | PatternMatchResults;
export declare function getPatternMatchResultsForCodeBlock(scanningContext: ScanningContext, text: string): null | PatternMatchResults;
export declare function hasPatternMatchResults(scanningContext: ScanningContext): boolean;
export declare function getTextNodeWithOffsetOrThrow(scanningContext: ScanningContext): TextNodeWithOffset;
export declare function transformTextNodeForMarkdownCriteria<T>(scanningContext: ScanningContext, elementNode: ElementNode, createHorizontalRuleNode: null | (() => DecoratorNode<T>)): void;
export declare function getParentElementNodeOrThrow(scanningContext: ScanningContext): ElementNode;
export {};
