/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor} from './LexicalEditor';
import type {LexicalNode, NodeMap} from './LexicalNode';
import type {
  GridSelection,
  NodeSelection,
  RangeSelection,
} from './LexicalSelection';
import type {SerializedRootNode} from './nodes/LexicalRootNode';

import invariant from 'shared/invariant';

import {$isElementNode} from '.';
import {readEditorState} from './LexicalUpdates';
import {$getRoot} from './LexicalUtils';
import {$createRootNode} from './nodes/LexicalRootNode';

export interface SerializedEditorState {
  root: SerializedRootNode;
}

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

function exportNodeToJSON<SerializedNode>(node: LexicalNode): SerializedNode {
  const serializedNode = node.exportJSON();
  const nodeClass = node.constructor;

  // @ts-expect-error TODO Replace Class utility type with InstanceType
  if (serializedNode.type !== nodeClass.getType()) {
    invariant(
      false,
      'LexicalNode: Node %s does not implement .exportJSON().',
      nodeClass.name,
    );
  }

  // @ts-expect-error TODO Replace Class utility type with InstanceType
  const serializedChildren = serializedNode.children;

  if ($isElementNode(node)) {
    if (!Array.isArray(serializedChildren)) {
      invariant(
        false,
        'LexicalNode: Node %s is an element but .exportJSON() does not have a children array.',
        nodeClass.name,
      );
    }

    const children = node.getChildren();

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const serializedChildNode = exportNodeToJSON(child);
      serializedChildren.push(serializedChildNode);
    }
  }

  // @ts-expect-error
  return serializedNode;
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
  toJSON(): SerializedEditorState {
    return readEditorState(this, () => ({
      root: exportNodeToJSON($getRoot()),
    }));
  }
}
