/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { EditorConfig } from '../LexicalEditor';
import type { DOMConversionMap, NodeKey, SerializedLexicalNode } from '../LexicalNode';
import type { GridSelection, NodeSelection, RangeSelection } from '../LexicalSelection';
import type { Spread } from 'lexical';
import { LexicalNode } from '../LexicalNode';
export declare type SerializedTextNode = Spread<{
    detail: number;
    format: number;
    mode: TextModeType;
    style: string;
    text: string;
}, SerializedLexicalNode>;
export declare type TextFormatType = 'bold' | 'underline' | 'strikethrough' | 'italic' | 'code' | 'subscript' | 'superscript';
export declare type TextModeType = 'normal' | 'token' | 'segmented' | 'inert';
export declare type TextMark = {
    end: null | number;
    id: string;
    start: null | number;
};
export declare type TextMarks = Array<TextMark>;
export declare class TextNode extends LexicalNode {
    __text: string;
    __format: number;
    __style: string;
    __mode: 0 | 1 | 2 | 3;
    __detail: number;
    static getType(): string;
    static clone(node: TextNode): TextNode;
    constructor(text: string, key?: NodeKey);
    getFormat(): number;
    getDetail(): number;
    getMode(): TextModeType;
    getStyle(): string;
    isToken(): boolean;
    isComposing(): boolean;
    isSegmented(): boolean;
    isInert(): boolean;
    isDirectionless(): boolean;
    isUnmergeable(): boolean;
    hasFormat(type: TextFormatType): boolean;
    isSimpleText(): boolean;
    getTextContent(includeInert?: boolean, includeDirectionless?: false): string;
    getFormatFlags(type: TextFormatType, alignWithFormat: null | number): number;
    createDOM(config: EditorConfig): HTMLElement;
    updateDOM(prevNode: TextNode, dom: HTMLElement, config: EditorConfig): boolean;
    static importDOM(): DOMConversionMap | null;
    static importJSON(serializedNode: SerializedTextNode): TextNode;
    exportJSON(): SerializedTextNode;
    selectionTransform(prevSelection: null | RangeSelection | NodeSelection | GridSelection, nextSelection: RangeSelection): void;
    setFormat(format: number): this;
    setDetail(detail: number): this;
    setStyle(style: string): this;
    toggleFormat(type: TextFormatType): this;
    toggleDirectionless(): this;
    toggleUnmergeable(): this;
    setMode(type: TextModeType): this;
    setTextContent(text: string): this;
    select(_anchorOffset?: number, _focusOffset?: number): RangeSelection;
    spliceText(offset: number, delCount: number, newText: string, moveSelection?: boolean): TextNode;
    canInsertTextBefore(): boolean;
    canInsertTextAfter(): boolean;
    splitText(...splitOffsets: Array<number>): Array<TextNode>;
    mergeWithSibling(target: TextNode): TextNode;
    isTextEntity(): boolean;
}
export declare function $createTextNode(text?: string): TextNode;
export declare function $isTextNode(node: LexicalNode | null | undefined): node is TextNode;
