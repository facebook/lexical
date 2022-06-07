/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */
import type { EditorState, LexicalEditor, NodeKey, RangeSelection } from 'lexical';
declare type OffsetElementNode = {
    child: null | OffsetNode;
    end: number;
    key: NodeKey;
    next: null | OffsetNode;
    parent: null | OffsetElementNode;
    prev: null | OffsetNode;
    start: number;
    type: 'element';
};
declare type OffsetTextNode = {
    child: null;
    end: number;
    key: NodeKey;
    next: null | OffsetNode;
    parent: null | OffsetElementNode;
    prev: null | OffsetNode;
    start: number;
    type: 'text';
};
declare type OffsetInlineNode = {
    child: null;
    end: number;
    key: NodeKey;
    next: null | OffsetNode;
    parent: null | OffsetElementNode;
    prev: null | OffsetNode;
    start: number;
    type: 'inline';
};
declare type OffsetNode = OffsetElementNode | OffsetTextNode | OffsetInlineNode;
declare type OffsetMap = Map<NodeKey, OffsetNode>;
export declare class OffsetView {
    _offsetMap: OffsetMap;
    _firstNode: null | OffsetNode;
    _blockOffsetSize: number;
    constructor(offsetMap: OffsetMap, firstNode: null | OffsetNode, blockOffsetSize?: number);
    createSelectionFromOffsets(originalStart: number, originalEnd: number, diffOffsetView?: OffsetView): null | RangeSelection;
    getOffsetsFromSelection(selection: RangeSelection): [number, number];
}
export declare function $createOffsetView(editor: LexicalEditor, blockOffsetSize?: number, editorState?: EditorState): OffsetView;
export {};
