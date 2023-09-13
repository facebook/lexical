/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { LexicalEditor } from './LexicalEditor';
import type { EditorState } from './LexicalEditorState';
import type { NodeKey } from './LexicalNode';
import type { ElementNode } from './nodes/LexicalElementNode';
import type { TextFormatType } from './nodes/LexicalTextNode';
import { DEPRECATED_GridCellNode, DEPRECATED_GridNode, DEPRECATED_GridRowNode, TextNode } from '.';
import { LexicalNode } from './LexicalNode';
export type TextPointType = {
    _selection: RangeSelection | GridSelection;
    getNode: () => TextNode;
    is: (point: PointType) => boolean;
    isBefore: (point: PointType) => boolean;
    key: NodeKey;
    offset: number;
    set: (key: NodeKey, offset: number, type: 'text' | 'element') => void;
    type: 'text';
};
export type ElementPointType = {
    _selection: RangeSelection | GridSelection;
    getNode: () => ElementNode;
    is: (point: PointType) => boolean;
    isBefore: (point: PointType) => boolean;
    key: NodeKey;
    offset: number;
    set: (key: NodeKey, offset: number, type: 'text' | 'element') => void;
    type: 'element';
};
export type PointType = TextPointType | ElementPointType;
export type GridMapValueType = {
    cell: DEPRECATED_GridCellNode;
    startRow: number;
    startColumn: number;
};
export type GridMapType = Array<Array<GridMapValueType>>;
export declare class Point {
    key: NodeKey;
    offset: number;
    type: 'text' | 'element';
    _selection: RangeSelection | GridSelection | null;
    constructor(key: NodeKey, offset: number, type: 'text' | 'element');
    is(point: PointType): boolean;
    isBefore(b: PointType): boolean;
    getNode(): LexicalNode;
    set(key: NodeKey, offset: number, type: 'text' | 'element'): void;
}
export declare function $moveSelectionPointToEnd(point: PointType, node: LexicalNode): void;
export interface BaseSelection {
    clone(): BaseSelection;
    dirty: boolean;
    extract(): Array<LexicalNode>;
    getNodes(): Array<LexicalNode>;
    getTextContent(): string;
    insertRawText(text: string): void;
    is(selection: null | RangeSelection | NodeSelection | GridSelection): boolean;
}
export declare class NodeSelection implements BaseSelection {
    _nodes: Set<NodeKey>;
    dirty: boolean;
    _cachedNodes: null | Array<LexicalNode>;
    constructor(objects: Set<NodeKey>);
    is(selection: null | RangeSelection | NodeSelection | GridSelection): boolean;
    add(key: NodeKey): void;
    delete(key: NodeKey): void;
    clear(): void;
    has(key: NodeKey): boolean;
    clone(): NodeSelection;
    extract(): Array<LexicalNode>;
    insertRawText(text: string): void;
    insertText(): void;
    insertNodes(nodes: Array<LexicalNode>, selectStart?: boolean): boolean;
    getNodes(): Array<LexicalNode>;
    getTextContent(): string;
}
export declare function $isRangeSelection(x: unknown): x is RangeSelection;
export type GridSelectionShape = {
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
};
export declare function DEPRECATED_$getGridCellNodeRect(GridCellNode: DEPRECATED_GridCellNode): {
    rowIndex: number;
    columnIndex: number;
    rowSpan: number;
    colSpan: number;
} | null;
export declare class GridSelection implements BaseSelection {
    gridKey: NodeKey;
    anchor: PointType;
    focus: PointType;
    dirty: boolean;
    _cachedNodes: Array<LexicalNode> | null;
    constructor(gridKey: NodeKey, anchor: PointType, focus: PointType);
    is(selection: null | RangeSelection | NodeSelection | GridSelection): boolean;
    set(gridKey: NodeKey, anchorCellKey: NodeKey, focusCellKey: NodeKey): void;
    clone(): GridSelection;
    isCollapsed(): boolean;
    isBackward(): boolean;
    getCharacterOffsets(): [number, number];
    extract(): Array<LexicalNode>;
    insertRawText(text: string): void;
    insertText(): void;
    insertNodes(nodes: Array<LexicalNode>, selectStart?: boolean): boolean;
    getShape(): GridSelectionShape;
    getNodes(): Array<LexicalNode>;
    getTextContent(): string;
}
export declare function DEPRECATED_$isGridSelection(x: unknown): x is GridSelection;
export declare class RangeSelection implements BaseSelection {
    anchor: PointType;
    focus: PointType;
    dirty: boolean;
    format: number;
    style: string;
    _cachedNodes: null | Array<LexicalNode>;
    constructor(anchor: PointType, focus: PointType, format: number, style: string);
    /**
     * Used to check if the provided selections is equal to this one by value,
     * inluding anchor, focus, format, and style properties.
     * @param selection - the Selection to compare this one to.
     * @returns true if the Selections are equal, false otherwise.
     */
    is(selection: null | RangeSelection | NodeSelection | GridSelection): boolean;
    /**
     * Returns whether the Selection is "backwards", meaning the focus
     * logically precedes the anchor in the EditorState.
     * @returns true if the Selection is backwards, false otherwise.
     */
    isBackward(): boolean;
    /**
     * Returns whether the Selection is "collapsed", meaning the anchor and focus are
     * the same node and have the same offset.
     *
     * @returns true if the Selection is collapsed, false otherwise.
     */
    isCollapsed(): boolean;
    /**
     * Gets all the nodes in the Selection. Uses caching to make it generally suitable
     * for use in hot paths.
     *
     * @returns an Array containing all the nodes in the Selection
     */
    getNodes(): Array<LexicalNode>;
    /**
     * Sets this Selection to be of type "text" at the provided anchor and focus values.
     *
     * @param anchorNode - the anchor node to set on the Selection
     * @param anchorOffset - the offset to set on the Selection
     * @param focusNode - the focus node to set on the Selection
     * @param focusOffset - the focus offset to set on the Selection
     */
    setTextNodeRange(anchorNode: TextNode, anchorOffset: number, focusNode: TextNode, focusOffset: number): void;
    /**
     * Gets the (plain) text content of all the nodes in the selection.
     *
     * @returns a string representing the text content of all the nodes in the Selection
     */
    getTextContent(): string;
    /**
     * Attempts to map a DOM selection range onto this Lexical Selection,
     * setting the anchor, focus, and type accordingly
     *
     * @param range a DOM Selection range conforming to the StaticRange interface.
     */
    applyDOMRange(range: StaticRange): void;
    /**
     * Creates a new RangeSelection, copying over all the property values from this one.
     *
     * @returns a new RangeSelection with the same property values as this one.
     */
    clone(): RangeSelection;
    /**
     * Toggles the provided format on all the TextNodes in the Selection.
     *
     * @param format a string TextFormatType to toggle on the TextNodes in the selection
     */
    toggleFormat(format: TextFormatType): void;
    /**
     * Sets the value of the style property on the Selection
     *
     * @param style - the style to set at the value of the style property.
     */
    setStyle(style: string): void;
    /**
     * Returns whether the provided TextFormatType is present on the Selection. This will be true if any node in the Selection
     * has the specified format.
     *
     * @param type the TextFormatType to check for.
     * @returns true if the provided format is currently toggled on on the Selection, false otherwise.
     */
    hasFormat(type: TextFormatType): boolean;
    /**
     * Attempts to insert the provided text into the EditorState at the current Selection.
     * converts tabs, newlines, and carriage returns into LexicalNodes.
     *
     * @param text the text to insert into the Selection
     */
    insertRawText(text: string): void;
    /**
     * Attempts to insert the provided text into the EditorState at the current Selection as a new
     * Lexical TextNode, according to a series of insertion heuristics based on the selection type and position.
     *
     * @param text the text to insert into the Selection
     */
    insertText(text: string): void;
    /**
     * Removes the text in the Selection, adjusting the EditorState accordingly.
     */
    removeText(): void;
    /**
     * Applies the provided format to the TextNodes in the Selection, splitting or
     * merging nodes as necessary.
     *
     * @param formatType the format type to apply to the nodes in the Selection.
     */
    formatText(formatType: TextFormatType): void;
    /**
     * Attempts to "intelligently" insert an arbitrary list of Lexical nodes into the EditorState at the
     * current Selection according to a set of heuristics that determine how surrounding nodes
     * should be changed, replaced, or moved to accomodate the incoming ones.
     *
     * @param nodes - the nodes to insert
     * @param selectStart - whether or not to select the start after the insertion.
     * @returns true if the nodes were inserted successfully, false otherwise.
     */
    insertNodes(nodes: Array<LexicalNode>, selectStart?: boolean): boolean;
    /**
     * Inserts a new ParagraphNode into the EditorState at the current Selection
     */
    insertParagraph(): void;
    /**
     * Inserts a logical linebreak, which may be a new LineBreakNode or a new ParagraphNode, into the EditorState at the
     * current Selection.
     *
     * @param selectStart whether or not to select the start of the insertion range after the operation completes.
     */
    insertLineBreak(selectStart?: boolean): void;
    /**
     * Returns the character-based offsets of the Selection, accounting for non-text Points
     * by using the children size or text content.
     *
     * @returns the character offsets for the Selection
     */
    getCharacterOffsets(): [number, number];
    /**
     * Extracts the nodes in the Selection, splitting nodes where necessary
     * to get offset-level precision.
     *
     * @returns The nodes in the Selection
     */
    extract(): Array<LexicalNode>;
    /**
     * Modifies the Selection according to the parameters and a set of heuristics that account for
     * various node types. Can be used to safely move or extend selection by one logical "unit" without
     * dealing explicitly with all the possible node types.
     *
     * @param alter the type of modification to perform
     * @param isBackward whether or not selection is backwards
     * @param granularity the granularity at which to apply the modification
     */
    modify(alter: 'move' | 'extend', isBackward: boolean, granularity: 'character' | 'word' | 'lineboundary'): void;
    /**
     * Performs one logical character deletion operation on the EditorState based on the current Selection.
     * Handles different node types.
     *
     * @param isBackward whether or not the selection is backwards.
     */
    deleteCharacter(isBackward: boolean): void;
    /**
     * Performs one logical line deletion operation on the EditorState based on the current Selection.
     * Handles different node types.
     *
     * @param isBackward whether or not the selection is backwards.
     */
    deleteLine(isBackward: boolean): void;
    /**
     * Performs one logical word deletion operation on the EditorState based on the current Selection.
     * Handles different node types.
     *
     * @param isBackward whether or not the selection is backwards.
     */
    deleteWord(isBackward: boolean): void;
}
export declare function $isNodeSelection(x: unknown): x is NodeSelection;
export declare function $isBlockElementNode(node: LexicalNode | null | undefined): node is ElementNode;
export declare function internalMakeRangeSelection(anchorKey: NodeKey, anchorOffset: number, focusKey: NodeKey, focusOffset: number, anchorType: 'text' | 'element', focusType: 'text' | 'element'): RangeSelection;
export declare function $createRangeSelection(): RangeSelection;
export declare function $createNodeSelection(): NodeSelection;
export declare function DEPRECATED_$createGridSelection(): GridSelection;
export declare function internalCreateSelection(editor: LexicalEditor): null | RangeSelection | NodeSelection | GridSelection;
export declare function internalCreateRangeSelection(lastSelection: null | RangeSelection | NodeSelection | GridSelection, domSelection: Selection | null, editor: LexicalEditor): null | RangeSelection;
export declare function $getSelection(): null | RangeSelection | NodeSelection | GridSelection;
export declare function $getPreviousSelection(): null | RangeSelection | NodeSelection | GridSelection;
export declare function $updateElementSelectionOnCreateDeleteNode(selection: RangeSelection, parentNode: LexicalNode, nodeOffset: number, times?: number): void;
export declare function applySelectionTransforms(nextEditorState: EditorState, editor: LexicalEditor): void;
export declare function moveSelectionPointToSibling(point: PointType, node: LexicalNode, parent: ElementNode, prevSibling: LexicalNode | null, nextSibling: LexicalNode | null): void;
export declare function adjustPointOffsetForMergedSibling(point: PointType, isBefore: boolean, key: NodeKey, target: TextNode, textLength: number): void;
export declare function updateDOMSelection(prevSelection: RangeSelection | NodeSelection | GridSelection | null, nextSelection: RangeSelection | NodeSelection | GridSelection | null, editor: LexicalEditor, domSelection: Selection, tags: Set<string>, rootElement: HTMLElement, nodeCount: number): void;
export declare function $insertNodes(nodes: Array<LexicalNode>, selectStart?: boolean): boolean;
export declare function $getTextContent(): string;
export declare function DEPRECATED_$computeGridMap(grid: DEPRECATED_GridNode, cellA: DEPRECATED_GridCellNode, cellB: DEPRECATED_GridCellNode): [GridMapType, GridMapValueType, GridMapValueType];
export declare function DEPRECATED_$getNodeTriplet(source: PointType | LexicalNode | DEPRECATED_GridCellNode): [DEPRECATED_GridCellNode, DEPRECATED_GridRowNode, DEPRECATED_GridNode];
