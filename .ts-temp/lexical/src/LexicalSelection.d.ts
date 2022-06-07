/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { LexicalEditor } from './LexicalEditor';
import type { EditorState } from './LexicalEditorState';
import type { LexicalNode, NodeKey } from './LexicalNode';
import type { ElementNode } from './nodes/LexicalElementNode';
import type { TextFormatType } from './nodes/LexicalTextNode';
import { TextNode } from '.';
export declare type TextPointType = {
    _selection: RangeSelection | GridSelection;
    getNode: () => TextNode;
    is: (PointType: any) => boolean;
    isAtNodeEnd: () => boolean;
    isBefore: (PointType: any) => boolean;
    key: NodeKey;
    offset: number;
    set: (key: NodeKey, offset: number, type: 'text' | 'element') => void;
    type: 'text';
};
export declare type ElementPointType = {
    _selection: RangeSelection | GridSelection;
    getNode: () => ElementNode;
    is: (PointType: any) => boolean;
    isAtNodeEnd: () => boolean;
    isBefore: (PointType: any) => boolean;
    key: NodeKey;
    offset: number;
    set: (key: NodeKey, offset: number, type: 'text' | 'element') => void;
    type: 'element';
};
export declare type PointType = TextPointType | ElementPointType;
export declare class Point {
    key: NodeKey;
    offset: number;
    type: 'text' | 'element';
    _selection: RangeSelection | GridSelection;
    constructor(key: NodeKey, offset: number, type: 'text' | 'element');
    is(point: PointType): boolean;
    isBefore(b: PointType): boolean;
    getNode(): LexicalNode;
    set(key: NodeKey, offset: number, type: 'text' | 'element'): void;
}
export declare function $moveSelectionPointToEnd(point: PointType, node: LexicalNode): void;
interface BaseSelection {
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
    getNodes(): Array<LexicalNode>;
    getTextContent(): string;
}
export declare function $isRangeSelection(x: unknown): x is RangeSelection;
export declare type GridSelectionShape = {
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
};
export declare class GridSelection implements BaseSelection {
    gridKey: NodeKey;
    anchor: PointType;
    focus: PointType;
    dirty: boolean;
    _cachedNodes: Array<LexicalNode>;
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
    getShape(): GridSelectionShape;
    getNodes(): Array<LexicalNode>;
    getTextContent(): string;
}
export declare function $isGridSelection(x: unknown): x is GridSelection;
export declare class RangeSelection implements BaseSelection {
    anchor: PointType;
    focus: PointType;
    dirty: boolean;
    format: number;
    _cachedNodes: null | Array<LexicalNode>;
    constructor(anchor: PointType, focus: PointType, format: number);
    is(selection: null | RangeSelection | NodeSelection | GridSelection): boolean;
    isBackward(): boolean;
    isCollapsed(): boolean;
    getNodes(): Array<LexicalNode>;
    setTextNodeRange(anchorNode: TextNode, anchorOffset: number, focusNode: TextNode, focusOffset: number): void;
    getTextContent(): string;
    applyDOMRange(range: StaticRange): void;
    clone(): RangeSelection;
    toggleFormat(format: TextFormatType): void;
    hasFormat(type: TextFormatType): boolean;
    insertRawText(text: string): void;
    insertText(text: string): void;
    removeText(): void;
    formatText(formatType: TextFormatType): void;
    insertNodes(nodes: Array<LexicalNode>, selectStart?: boolean): boolean;
    insertParagraph(): void;
    insertLineBreak(selectStart?: boolean): void;
    getCharacterOffsets(): [number, number];
    extract(): Array<LexicalNode>;
    modify(alter: 'move' | 'extend', isBackward: boolean, granularity: 'character' | 'word' | 'lineboundary'): void;
    deleteCharacter(isBackward: boolean): void;
    deleteLine(isBackward: boolean): void;
    deleteWord(isBackward: boolean): void;
}
export declare function $isNodeSelection(x: unknown): x is NodeSelection;
export declare function internalMakeRangeSelection(anchorKey: NodeKey, anchorOffset: number, focusKey: NodeKey, focusOffset: number, anchorType: 'text' | 'element', focusType: 'text' | 'element'): RangeSelection;
export declare function $createRangeSelection(): RangeSelection;
export declare function $createNodeSelection(): NodeSelection;
export declare function $createGridSelection(): GridSelection;
export declare function internalCreateSelection(editor: LexicalEditor): null | RangeSelection | NodeSelection | GridSelection;
export declare function internalCreateRangeSelection(lastSelection: null | RangeSelection | NodeSelection | GridSelection, domSelection: Selection | null, editor: LexicalEditor): null | RangeSelection;
export declare function $getSelection(): null | RangeSelection | NodeSelection | GridSelection;
export declare function $getPreviousSelection(): null | RangeSelection | NodeSelection | GridSelection;
export declare function $updateElementSelectionOnCreateDeleteNode(selection: RangeSelection, parentNode: LexicalNode, nodeOffset: number, times?: number): void;
export declare function applySelectionTransforms(nextEditorState: EditorState, editor: LexicalEditor): void;
export declare function moveSelectionPointToSibling(point: PointType, node: LexicalNode, parent: ElementNode, prevSibling: LexicalNode | null, nextSibling: LexicalNode | null): void;
export declare function adjustPointOffsetForMergedSibling(point: PointType, isBefore: boolean, key: NodeKey, target: TextNode, textLength: number): void;
export declare function updateDOMSelection(prevSelection: RangeSelection | NodeSelection | GridSelection | null, nextSelection: RangeSelection | NodeSelection | GridSelection | null, editor: LexicalEditor, domSelection: Selection, tags: Set<string>, rootElement: HTMLElement): void;
export {};
