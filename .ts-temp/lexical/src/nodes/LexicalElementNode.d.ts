/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { NodeKey, SerializedLexicalNode } from '../LexicalNode';
import type { GridSelection, NodeSelection, RangeSelection } from '../LexicalSelection';
import type { Spread } from 'lexical';
import { TextNode } from '../';
import { LexicalNode } from '../LexicalNode';
export declare type SerializedElementNode = Spread<{
    children: Array<SerializedLexicalNode>;
    direction: 'ltr' | 'rtl' | null;
    format: ElementFormatType;
    indent: number;
}, SerializedLexicalNode>;
export declare type ElementFormatType = 'left' | 'center' | 'right' | 'justify' | '';
export declare class ElementNode extends LexicalNode {
    __children: Array<NodeKey>;
    __format: number;
    __indent: number;
    __dir: 'ltr' | 'rtl' | null;
    constructor(key?: NodeKey);
    getFormat(): number;
    getFormatType(): ElementFormatType;
    getIndent(): number;
    getChildren<T extends LexicalNode>(): Array<T>;
    getChildrenKeys(): Array<NodeKey>;
    getChildrenSize(): number;
    isEmpty(): boolean;
    isDirty(): boolean;
    isLastChild(): boolean;
    getAllTextNodes(includeInert?: boolean): Array<TextNode>;
    getFirstDescendant<T extends LexicalNode>(): null | T;
    getLastDescendant<T extends LexicalNode>(): null | T;
    getDescendantByIndex<T extends LexicalNode>(index: number): null | T;
    getFirstChild<T extends LexicalNode>(): null | T;
    getFirstChildOrThrow<T extends LexicalNode>(): T;
    getLastChild<T extends LexicalNode>(): null | T;
    getChildAtIndex<T extends LexicalNode>(index: number): null | T;
    getTextContent(includeInert?: boolean, includeDirectionless?: false): string;
    getDirection(): 'ltr' | 'rtl' | null;
    hasFormat(type: ElementFormatType): boolean;
    select(_anchorOffset?: number, _focusOffset?: number): RangeSelection;
    selectStart(): RangeSelection;
    selectEnd(): RangeSelection;
    clear(): this;
    append(...nodesToAppend: LexicalNode[]): this;
    setDirection(direction: 'ltr' | 'rtl' | null): this;
    setFormat(type: ElementFormatType): this;
    setIndent(indentLevel: number): this;
    splice(start: number, deleteCount: number, nodesToInsert: Array<LexicalNode>): this;
    exportJSON(): SerializedElementNode;
    insertNewAfter(selection: RangeSelection): null | LexicalNode;
    canInsertTab(): boolean;
    canIndent(): boolean;
    collapseAtStart(selection: RangeSelection): boolean;
    excludeFromCopy(destination?: 'clone' | 'html'): boolean;
    canExtractContents(): boolean;
    canReplaceWith(replacement: LexicalNode): boolean;
    canInsertAfter(node: LexicalNode): boolean;
    canBeEmpty(): boolean;
    canInsertTextBefore(): boolean;
    canInsertTextAfter(): boolean;
    isInline(): boolean;
    canMergeWith(node: ElementNode): boolean;
    extractWithChild(child: LexicalNode, selection: RangeSelection | NodeSelection | GridSelection, destination: 'clone' | 'html'): boolean;
}
export declare function $isElementNode(node: LexicalNode | null | undefined): node is ElementNode;
