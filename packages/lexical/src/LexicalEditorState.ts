/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor} from './LexicalEditor';
import type {LexicalNode, NodeMap, SerializedLexicalNode} from './LexicalNode';
import type {BaseSelection} from './LexicalSelection';
import type {SerializedElementNode} from './nodes/LexicalElementNode';
import type {SerializedRootNode} from './nodes/LexicalRootNode';

import invariant from 'shared/invariant';

// import {readEditorState} from './LexicalUpdates'; // Removed
// import {$getRoot} from './LexicalUtils'; // No longer needed here
import {$isElementNode} from './nodes/LexicalElementNode'; // Keep if exportNodeToJSON or other internal logic needs it
import {$createRootNode} from './nodes/LexicalRootNode'; // Keep for createEmptyEditorState

export interface SerializedEditorState<
  T extends SerializedLexicalNode = SerializedLexicalNode,
> {
  root: SerializedRootNode<T>;
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

function exportNodeToJSON<SerializedNode extends SerializedLexicalNode>(
  node: LexicalNode,
): SerializedNode {
  const serializedNode = node.exportJSON();
  const nodeClass = node.constructor;

  if (serializedNode.type !== nodeClass.getType()) {
    invariant(
      false,
      'LexicalNode: Node %s does not match the serialized type. Check if .exportJSON() is implemented and it is returning the correct type.',
      nodeClass.name,
    );
  }

  if ($isElementNode(node)) {
    const serializedChildren = (serializedNode as SerializedElementNode)
      .children;
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

export interface EditorStateReadOptions {
  editor?: LexicalEditor | null;
}

export class EditorState {
  _nodeMap: NodeMap;
  _selection: null | BaseSelection;
  _flushSync: boolean;
  _readOnly: boolean;

  constructor(nodeMap: NodeMap, selection?: null | BaseSelection) {
    this._nodeMap = nodeMap;
    this._selection = selection || null;
    this._flushSync = false;
    this._readOnly = false;
  }

  isEmpty(): boolean {
    return this._nodeMap.size === 1 && this._selection === null;
  }

  read<V>(callbackFn: () => V, _options?: EditorStateReadOptions): V {
    // Assumes read context is already set by the caller (e.g., LexicalEditor.read)
    // The original readEditorState also managed activeEditor, activeEditorState, isReadOnlyMode.
    // This direct call implies that these globals are managed by the initiator of the read operation.
    return callbackFn();
  }

  clone(selection?: null | BaseSelection): EditorState {
    const editorState = new EditorState(
      this._nodeMap,
      selection === undefined ? this._selection : selection,
    );
    editorState._readOnly = true;

    return editorState;
  }
  toJSON(): SerializedEditorState {
    // Assumes read context is already set.
    // The activeEditorState is available via getActiveEditorState() which is called by $getRoot,
    // or, if we want to avoid $getRoot, we can directly access the root from the current editorState's nodeMap.
    // Since toJSON is a method of EditorState, `this` is the editorState.
    const root = this._nodeMap.get('root') as SerializedRootNode; // Cast needed if exportNodeToJSON expects RootNode but gets SerializedRootNode after processing
    if (!root) {
      invariant(false, 'LexicalEditorState.toJSON: Root node not found in nodeMap.');
    }
    // exportNodeToJSON expects a LexicalNode, not a SerializedRootNode directly from map if it's already serialized.
    // The original $getRoot() returns a RootNode instance.
    const rootNode = this._nodeMap.get('root') as RootNode;
    if (!rootNode) {
      invariant(false, 'LexicalEditorState.toJSON: Root node not found in nodeMap.');
    }
    return {
      root: exportNodeToJSON(rootNode), // Pass the RootNode instance
    };
  }
}
