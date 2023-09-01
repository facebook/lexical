/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { EditorConfig, LexicalEditor, Spread } from '../LexicalEditor';
import type { DOMConversionMap, DOMExportOutput, NodeKey, SerializedLexicalNode } from '../LexicalNode';
import type { GridSelection, NodeSelection, RangeSelection } from '../LexicalSelection';
import { LexicalNode } from '../LexicalNode';
export type SerializedTextNode = Spread<{
    detail: number;
    format: number;
    mode: TextModeType;
    style: string;
    text: string;
}, SerializedLexicalNode>;
export type TextDetailType = 'directionless' | 'unmergable';
export type TextFormatType = 'bold' | 'underline' | 'strikethrough' | 'italic' | 'highlight' | 'code' | 'subscript' | 'superscript';
export type TextModeType = 'normal' | 'token' | 'segmented';
export type TextMark = {
    end: null | number;
    id: string;
    start: null | number;
};
export type TextMarks = Array<TextMark>;
/** @noInheritDoc */
export declare class TextNode extends LexicalNode {
    __text: string;
    /** @internal */
    __format: number;
    /** @internal */
    __style: string;
    /** @internal */
    __mode: 0 | 1 | 2 | 3;
    /** @internal */
    __detail: number;
    static getType(): string;
    static clone(node: TextNode): TextNode;
    constructor(text: string, key?: NodeKey);
    /**
     * Returns a 32-bit integer that represents the TextFormatTypes currently applied to the
     * TextNode. You probably don't want to use this method directly - consider using TextNode.hasFormat instead.
     *
     * @returns a number representing the format of the text node.
     */
    getFormat(): number;
    /**
     * Returns a 32-bit integer that represents the TextDetailTypes currently applied to the
     * TextNode. You probably don't want to use this method directly - consider using TextNode.isDirectionless
     * or TextNode.isUnmergeable instead.
     *
     * @returns a number representing the detail of the text node.
     */
    getDetail(): number;
    /**
     * Returns the mode (TextModeType) of the TextNode, which may be "normal", "token", or "segmented"
     *
     * @returns TextModeType.
     */
    getMode(): TextModeType;
    /**
     * Returns the styles currently applied to the node. This is analogous to CSSText in the DOM.
     *
     * @returns CSSText-like string of styles applied to the underlying DOM node.
     */
    getStyle(): string;
    /**
     * Returns whether or not the node is in "token" mode. TextNodes in token mode can be navigated through character-by-character
     * with a RangeSelection, but are deleted as a single entity (not invdividually by character).
     *
     * @returns true if the node is in token mode, false otherwise.
     */
    isToken(): boolean;
    /**
     *
     * @returns true if Lexical detects that an IME or other 3rd-party script is attempting to
     * mutate the TextNode, false otherwise.
     */
    isComposing(): boolean;
    /**
     * Returns whether or not the node is in "segemented" mode. TextNodes in segemented mode can be navigated through character-by-character
     * with a RangeSelection, but are deleted in space-delimited "segments".
     *
     * @returns true if the node is in segmented mode, false otherwise.
     */
    isSegmented(): boolean;
    /**
     * Returns whether or not the node is "directionless". Directionless nodes don't respect changes between RTL and LTR modes.
     *
     * @returns true if the node is directionless, false otherwise.
     */
    isDirectionless(): boolean;
    /**
     * Returns whether or not the node is unmergeable. In some scenarios, Lexical tries to merge
     * adjacent TextNodes into a single TextNode. If a TextNode is unmergeable, this won't happen.
     *
     * @returns true if the node is unmergeable, false otherwise.
     */
    isUnmergeable(): boolean;
    /**
     * Returns whether or not the node has the provided format applied. Use this with the human-readable TextFormatType
     * string values to get the format of a TextNode.
     *
     * @param type - the TextFormatType to check for.
     *
     * @returns true if the node has the provided format, false otherwise.
     */
    hasFormat(type: TextFormatType): boolean;
    /**
     * Returns whether or not the node is simple text. Simple text is defined as a TextNode that has the string type "text"
     * (i.e., not a subclass) and has no mode applied to it (i.e., not segmented or token).
     *
     * @returns true if the node is simple text, false otherwise.
     */
    isSimpleText(): boolean;
    /**
     * Returns the text content of the node as a string.
     *
     * @returns a string representing the text content of the node.
     */
    getTextContent(): string;
    /**
     * Returns the format flags applied to the node as a 32-bit integer.
     *
     * @returns a number representing the TextFormatTypes applied to the node.
     */
    getFormatFlags(type: TextFormatType, alignWithFormat: null | number): number;
    createDOM(config: EditorConfig): HTMLElement;
    updateDOM(prevNode: TextNode, dom: HTMLElement, config: EditorConfig): boolean;
    static importDOM(): DOMConversionMap | null;
    static importJSON(serializedNode: SerializedTextNode): TextNode;
    exportDOM(editor: LexicalEditor): DOMExportOutput;
    exportJSON(): SerializedTextNode;
    selectionTransform(prevSelection: null | RangeSelection | NodeSelection | GridSelection, nextSelection: RangeSelection): void;
    /**
     * Sets the node format to the provided TextFormatType or 32-bit integer. Note that the TextFormatType
     * version of the argument can only specify one format and doing so will remove all other formats that
     * may be applied to the node. For toggling behavior, consider using {@link TextNode.toggleFormat}
     *
     * @param format - TextFormatType or 32-bit integer representing the node format.
     *
     * @returns this TextNode.
     * // TODO 0.12 This should just be a `string`.
     */
    setFormat(format: TextFormatType | number): this;
    /**
     * Sets the node detail to the provided TextDetailType or 32-bit integer. Note that the TextDetailType
     * version of the argument can only specify one detail value and doing so will remove all other detail values that
     * may be applied to the node. For toggling behavior, consider using {@link TextNode.toggleDirectionless}
     * or {@link TextNode.togglerUnmergeable}
     *
     * @param detail - TextDetailType or 32-bit integer representing the node detail.
     *
     * @returns this TextNode.
     * // TODO 0.12 This should just be a `string`.
     */
    setDetail(detail: TextDetailType | number): this;
    /**
     * Sets the node style to the provided CSSText-like string. Set this property as you
     * would an HTMLElement style attribute to apply inline styles to the underlying DOM Element.
     *
     * @param style - CSSText to be applied to the underlying HTMLElement.
     *
     * @returns this TextNode.
     */
    setStyle(style: string): this;
    /**
     * Applies the provided format to this TextNode if it's not present. Removes it if it is present.
     * Prefer using this method to turn specific formats on and off.
     *
     * @param type - TextFormatType to toggle.
     *
     * @returns this TextNode.
     */
    toggleFormat(type: TextFormatType): this;
    /**
     * Toggles the directionless detail value of the node. Prefer using this method over setDetail.
     *
     * @returns this TextNode.
     */
    toggleDirectionless(): this;
    /**
     * Toggles the unmergeable detail value of the node. Prefer using this method over setDetail.
     *
     * @returns this TextNode.
     */
    toggleUnmergeable(): this;
    /**
     * Sets the mode of the node.
     *
     * @returns this TextNode.
     */
    setMode(type: TextModeType): this;
    /**
     * Sets the text content of the node.
     *
     * @param text - the string to set as the text value of the node.
     *
     * @returns this TextNode.
     */
    setTextContent(text: string): this;
    /**
     * Sets the current Lexical selection to be a RangeSelection with anchor and focus on this TextNode at the provided offsets.
     *
     * @param _anchorOffset - the offset at which the Selection anchor will be placed.
     * @param _focusOffset - the offset at which the Selection focus will be placed.
     *
     * @returns the new RangeSelection.
     */
    select(_anchorOffset?: number, _focusOffset?: number): RangeSelection;
    /**
     * Inserts the provided text into this TextNode at the provided offset, deleting the number of characters
     * specified. Can optionally calculate a new selection after the operation is complete.
     *
     * @param offset - the offset at which the splice operation should begin.
     * @param delCount - the number of characters to delete, starting from the offset.
     * @param newText - the text to insert into the TextNode at the offset.
     * @param moveSelection - optional, whether or not to move selection to the end of the inserted substring.
     *
     * @returns this TextNode.
     */
    spliceText(offset: number, delCount: number, newText: string, moveSelection?: boolean): TextNode;
    /**
     * This method is meant to be overriden by TextNode subclasses to control the behavior of those nodes
     * when a user event would cause text to be inserted before them in the editor. If true, Lexical will attempt
     * to insert text into this node. If false, it will insert the text in a new sibling node.
     *
     * @returns true if text can be inserted before the node, false otherwise.
     */
    canInsertTextBefore(): boolean;
    /**
     * This method is meant to be overriden by TextNode subclasses to control the behavior of those nodes
     * when a user event would cause text to be inserted after them in the editor. If true, Lexical will attempt
     * to insert text into this node. If false, it will insert the text in a new sibling node.
     *
     * @returns true if text can be inserted after the node, false otherwise.
     */
    canInsertTextAfter(): boolean;
    /**
     * Splits this TextNode at the provided character offsets, forming new TextNodes from the substrings
     * formed by the split, and inserting those new TextNodes into the editor, replacing the one that was split.
     *
     * @param splitOffsets - rest param of the text content character offsets at which this node should be split.
     *
     * @returns an Array containing the newly-created TextNodes.
     */
    splitText(...splitOffsets: Array<number>): Array<TextNode>;
    /**
     * Merges the target TextNode into this TextNode, removing the target node.
     *
     * @param target - the TextNode to merge into this one.
     *
     * @returns this TextNode.
     */
    mergeWithSibling(target: TextNode): TextNode;
    /**
     * This method is meant to be overriden by TextNode subclasses to control the behavior of those nodes
     * when used with the registerLexicalTextEntity function. If you're using registerLexicalTextEntity, the
     * node class that you create and replace matched text with should return true from this method.
     *
     * @returns true if the node is to be treated as a "text entity", false otherwise.
     */
    isTextEntity(): boolean;
}
export declare function findParentPreDOMNode(node: Node): Node | null;
export declare function $createTextNode(text?: string): TextNode;
export declare function $isTextNode(node: LexicalNode | null | undefined): node is TextNode;
