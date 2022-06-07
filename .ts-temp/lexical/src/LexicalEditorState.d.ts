/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { LexicalEditor } from './LexicalEditor';
import type { NodeMap } from './LexicalNode';
import type { GridSelection, NodeSelection, RangeSelection } from './LexicalSelection';
import type { SerializedRootNode } from './nodes/LexicalRootNode';
export interface SerializedEditorState {
    root: SerializedRootNode;
}
export declare function editorStateHasDirtySelection(editorState: EditorState, editor: LexicalEditor): boolean;
export declare function cloneEditorState(current: EditorState): EditorState;
export declare function createEmptyEditorState(): EditorState;
export declare class EditorState {
    _nodeMap: NodeMap;
    _selection: null | RangeSelection | NodeSelection | GridSelection;
    _flushSync: boolean;
    _readOnly: boolean;
    constructor(nodeMap: NodeMap, selection?: RangeSelection | NodeSelection | GridSelection | null);
    isEmpty(): boolean;
    read<V>(callbackFn: () => V): V;
    clone(selection?: RangeSelection | NodeSelection | GridSelection | null): EditorState;
    toJSON(): SerializedEditorState;
}
