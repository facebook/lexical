/** @module @lexical/rich-text */
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { DOMConversionMap, DOMExportOutput, EditorConfig, LexicalCommand, LexicalEditor, LexicalNode, NodeKey, ParagraphNode, PasteCommandType, RangeSelection, SerializedElementNode, Spread } from 'lexical';
import { ElementNode } from 'lexical';
export type SerializedHeadingNode = Spread<{
    tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}, SerializedElementNode>;
export declare const DRAG_DROP_PASTE: LexicalCommand<Array<File>>;
export type SerializedQuoteNode = SerializedElementNode;
/** @noInheritDoc */
export declare class QuoteNode extends ElementNode {
    static getType(): string;
    static clone(node: QuoteNode): QuoteNode;
    constructor(key?: NodeKey);
    createDOM(config: EditorConfig): HTMLElement;
    updateDOM(prevNode: QuoteNode, dom: HTMLElement): boolean;
    static importDOM(): DOMConversionMap | null;
    exportDOM(editor: LexicalEditor): DOMExportOutput;
    static importJSON(serializedNode: SerializedQuoteNode): QuoteNode;
    exportJSON(): SerializedElementNode;
    insertNewAfter(_: RangeSelection, restoreSelection?: boolean): ParagraphNode;
    collapseAtStart(): true;
}
export declare function $createQuoteNode(): QuoteNode;
export declare function $isQuoteNode(node: LexicalNode | null | undefined): node is QuoteNode;
export type HeadingTagType = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
/** @noInheritDoc */
export declare class HeadingNode extends ElementNode {
    /** @internal */
    __tag: HeadingTagType;
    static getType(): string;
    static clone(node: HeadingNode): HeadingNode;
    constructor(tag: HeadingTagType, key?: NodeKey);
    getTag(): HeadingTagType;
    createDOM(config: EditorConfig): HTMLElement;
    updateDOM(prevNode: HeadingNode, dom: HTMLElement): boolean;
    static importDOM(): DOMConversionMap | null;
    exportDOM(editor: LexicalEditor): DOMExportOutput;
    static importJSON(serializedNode: SerializedHeadingNode): HeadingNode;
    exportJSON(): SerializedHeadingNode;
    insertNewAfter(selection?: RangeSelection, restoreSelection?: boolean): ParagraphNode | HeadingNode;
    collapseAtStart(): true;
    extractWithChild(): boolean;
}
export declare function $createHeadingNode(headingTag: HeadingTagType): HeadingNode;
export declare function $isHeadingNode(node: LexicalNode | null | undefined): node is HeadingNode;
export declare function eventFiles(event: DragEvent | PasteCommandType): [boolean, Array<File>, boolean];
export declare function registerRichText(editor: LexicalEditor): () => void;
