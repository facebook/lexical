/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalEditor} from './LexicalEditor';
import type {LexicalNode, NodeKey, NodeMap} from './LexicalNode';
import type {ParsedNode, ParsedSelection} from './LexicalParsing';
import type {
  GridSelection,
  NodeSelection,
  RangeSelection,
} from './LexicalSelection';

import {
  $isGridSelection,
  $isNodeSelection,
  $isRangeSelection,
} from './LexicalSelection';
import {readEditorState} from './LexicalUpdates';
import {$createRootNode} from './nodes/LexicalRootNode';

export type ParsedEditorState = {
  _nodeMap: Array<[NodeKey, ParsedNode]>,
  _selection: null | ParsedSelection,
};

export type JSONEditorState = {
  _nodeMap: Array<[NodeKey, LexicalNode]>,
  _selection: null | ParsedSelection,
};

export function editorStateHasDirtySelection(
  editorState: EditorState,
  editor: LexicalEditor,
): boolean {
  const currentSelection = editor.getEditorState()._selection;
  const pendingSelection = editorState._selection;
  // Check if we need to update because of changes in selection
  if (pendingSelection !== null) {
    if (pendingSelection.dirty || !pendingSelection.is(currentSelection)) {
      return true;
    }
  } else if (currentSelection !== null) {
    return true;
  }
  return false;
}

export function cloneEditorState(current: EditorState): EditorState {
  return new EditorState(new Map(current._nodeMap));
}

export function createEmptyEditorState(): EditorState {
  return new EditorState(new Map([['root', $createRootNode()]]));
}

export class EditorState {
  _nodeMap: NodeMap;
  _selection: null | RangeSelection | NodeSelection | GridSelection;
  _flushSync: boolean;
  _readOnly: boolean;

  constructor(
    nodeMap: NodeMap,
    selection?: RangeSelection | NodeSelection | GridSelection | null,
  ) {
    this._nodeMap = nodeMap;
    this._selection = selection || null;
    this._flushSync = false;
    this._readOnly = false;
  }
  isEmpty(): boolean {
    return this._nodeMap.size === 1 && this._selection === null;
  }
  read<V>(callbackFn: () => V): V {
    return readEditorState(this, callbackFn);
  }
  clone(
    selection?: RangeSelection | NodeSelection | GridSelection | null,
  ): EditorState {
    const editorState = new EditorState(
      this._nodeMap,
      selection === undefined ? this._selection : selection,
    );
    editorState._readOnly = true;
    return editorState;
  }
  toJSON(space?: string | number): JSONEditorState {
    const selection = this._selection;

    return {
      _nodeMap: Array.from(this._nodeMap.entries()),
      _selection: $isRangeSelection(selection)
        ? {
            anchor: {
              key: selection.anchor.key,
              offset: selection.anchor.offset,
              type: selection.anchor.type,
            },
            focus: {
              key: selection.focus.key,
              offset: selection.focus.offset,
              type: selection.focus.type,
            },
            type: 'range',
          }
        : $isNodeSelection(selection)
        ? {
            nodes: Array.from(selection._nodes),
            type: 'node',
          }
        : $isGridSelection(selection)
        ? {
            anchor: {
              key: selection.anchor.key,
              offset: selection.anchor.offset,
              type: selection.anchor.type,
            },
            focus: {
              key: selection.focus.key,
              offset: selection.focus.offset,
              type: selection.focus.type,
            },
            gridKey: selection.gridKey,
            type: 'grid',
          }
        : null,
    };
  }
}
