/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {RootNode} from './OutlineRootNode';
import type {OutlineEditor} from './OutlineEditor';
import type {
  OutlineNode,
  NodeKey,
  ParsedNode,
  NodeMapType,
} from './OutlineNode';
import type {Selection} from './OutlineSelection';
import type {Node as ReactNode} from 'react';
import type {ParsedNodeMap} from './OutlineNode';

import {reconcileViewModel} from './OutlineReconciler';
import {getSelection, createSelectionFromParse} from './OutlineSelection';
import {getNodeByKey, createNodeFromParse} from './OutlineNode';
import {TextNode} from '.';
import {invariant} from './OutlineUtils';

export type View = {
  clearSelection(): void,
  getRoot: () => RootNode,
  getNodeByKey: (key: NodeKey) => null | OutlineNode,
  getSelection: () => null | Selection,
  setSelection: (selection: Selection) => void,
  createNodeFromParse: (
    parsedNode: ParsedNode,
    parsedNodeMap: ParsedNodeMap,
  ) => OutlineNode,
};

export type ParsedViewModel = {
  _selection: null | {
    anchorKey: string,
    anchorOffset: number,
    focusKey: string,
    focusOffset: number,
  },
  _nodeMap: {root: ParsedNode, [key: NodeKey]: ParsedNode},
};

let activeViewModel = null;
let activeEditor = null;
let activeReadyOnlyMode = false;

export function shouldErrorOnReadOnly(): void {
  invariant(!activeReadyOnlyMode, 'Cannot use method in read-only mode.');
}

export function getActiveViewModel(): ViewModel {
  if (activeViewModel === null) {
    throw new Error(
      'Unable to find an active view model. ' +
        'View methods or node methods can only be used ' +
        'synchronously during the callback of ' +
        'editor.update() or viewModel.read().',
    );
  }
  return activeViewModel;
}

export function getActiveEditor(): OutlineEditor {
  if (activeEditor === null) {
    throw new Error(
      'Unable to find an active editor. ' +
        'View methods or node methods can only be used ' +
        'synchronously during the callback of ' +
        'editor.update() or viewModel.read().',
    );
  }
  return activeEditor;
}

const view: View = {
  getRoot() {
    return getActiveViewModel()._nodeMap.root;
  },
  getNodeByKey,
  getSelection,
  clearSelection(): void {
    const viewModel = getActiveViewModel();
    viewModel._selection = null;
  },
  setSelection(selection: Selection): void {
    const viewModel = getActiveViewModel();
    viewModel._selection = selection;
  },
  createNodeFromParse(
    parsedNode: ParsedNode,
    parsedNodeMap: ParsedNodeMap,
  ): OutlineNode {
    shouldErrorOnReadOnly();
    const editor = getActiveEditor();
    return createNodeFromParse(parsedNode, parsedNodeMap, editor, null);
  },
};

export function viewModelHasDirtySelectionOrNeedsSync(
  viewModel: ViewModel,
  editor: OutlineEditor,
): boolean {
  const selection = viewModel._selection;
  const currentSelection = editor.getViewModel()._selection;
  if (
    (currentSelection !== null && selection === null) ||
    (currentSelection === null && selection !== null)
  ) {
    return true;
  }
  return selection !== null && (selection.isDirty || selection.needsSync);
}

export function enterViewModelScope<V>(
  callbackFn: (view: View) => V,
  viewModel: ViewModel,
  editor: null | OutlineEditor,
  readOnly: boolean,
): V {
  const previousActiveViewModel = activeViewModel;
  const previousReadyOnlyMode = activeReadyOnlyMode;
  const previousActiveEditor = activeEditor;
  activeViewModel = viewModel;
  activeReadyOnlyMode = readOnly;
  activeEditor = editor;
  try {
    return callbackFn(view);
  } finally {
    activeViewModel = previousActiveViewModel;
    activeReadyOnlyMode = previousReadyOnlyMode;
    activeEditor = previousActiveEditor;
  }
}

export function triggerTextMutationListeners(
  viewModel: ViewModel,
  editor: OutlineEditor,
): void {
  const textNodeTransforms = editor._textNodeTransforms;
  if (textNodeTransforms.size > 0) {
    const nodeMap = viewModel._nodeMap;
    const dirtyNodes = Array.from(viewModel._dirtyNodes);
    const transforms = Array.from(textNodeTransforms);

    for (let s = 0; s < dirtyNodes.length; s++) {
      const nodeKey = dirtyNodes[s];
      const node = nodeMap[nodeKey];

      if (node !== undefined && node.isAttached()) {
        // Apply text transforms
        if (node instanceof TextNode) {
          for (let i = 0; i < transforms.length; i++) {
            transforms[i](node, view);
            if (!node.isAttached()) {
              break;
            }
          }
        }
      }
    }
  }
}

export function garbageCollectDetachedNodes(
  viewModel: ViewModel,
  editor: OutlineEditor,
): void {
  const dirtyNodes = Array.from(viewModel._dirtyNodes);
  const nodeMap = viewModel._nodeMap;
  const nodeDecorators = editor._nodeDecorators;
  let pendingNodeDecorators;

  for (let s = 0; s < dirtyNodes.length; s++) {
    const nodeKey = dirtyNodes[s];
    const node = nodeMap[nodeKey];

    if (node !== undefined && !node.isAttached()) {
      // Remove decorator if needed
      if (nodeDecorators[nodeKey] !== undefined) {
        if (pendingNodeDecorators === undefined) {
          pendingNodeDecorators = {...nodeDecorators};
          editor._pendingNodeDecorators = pendingNodeDecorators;
        }
        delete pendingNodeDecorators[nodeKey];
      }
      // Garbage collect node
      delete nodeMap[nodeKey];
    }
  }
}

export function commitPendingUpdates(editor: OutlineEditor): void {
  const pendingViewModel = editor._pendingViewModel;
  if (editor._editorElement === null || pendingViewModel === null) {
    return;
  }
  const currentViewModel = editor._viewModel;
  editor._pendingViewModel = null;
  editor._viewModel = pendingViewModel;
  const previousActiveViewModel = activeViewModel;
  activeViewModel = pendingViewModel;
  reconcileViewModel(currentViewModel, pendingViewModel, editor);
  activeViewModel = previousActiveViewModel;
  const pendingNodeDecorators = editor._pendingNodeDecorators;
  if (pendingNodeDecorators !== null) {
    editor._nodeDecorators = pendingNodeDecorators;
    editor._pendingNodeDecorators = null;
    triggerDecoratorListeners(pendingNodeDecorators, editor);
  }
  triggerUpdateListeners(editor);
}

export function triggerDecoratorListeners(
  nodeDecorators: {[NodeKey]: ReactNode},
  editor: OutlineEditor,
): void {
  const listeners = Array.from(editor._decoratorListeners);
  for (let i = 0; i < listeners.length; i++) {
    listeners[i](nodeDecorators);
  }
}

export function triggerUpdateListeners(editor: OutlineEditor): void {
  const viewModel = editor._viewModel;
  const listeners = Array.from(editor._updateListeners);
  for (let i = 0; i < listeners.length; i++) {
    listeners[i](viewModel);
  }
}

export function cloneViewModel(current: ViewModel): ViewModel {
  const draft = new ViewModel({...current._nodeMap});
  return draft;
}

export class ViewModel {
  _nodeMap: NodeMapType;
  _selection: null | Selection;
  _dirtyNodes: Set<NodeKey>;
  _dirtySubTrees: Set<NodeKey>;
  _isDirty: boolean;

  constructor(nodeMap: NodeMapType) {
    this._nodeMap = nodeMap;
    this._selection = null;
    // Dirty nodes are nodes that have been added or updated
    // in comparison to the previous view model. We also use
    // this Set for performance optimizations during the
    // production of a draft view model and during undo/redo.
    this._dirtyNodes = new Set();
    // We make nodes as "dirty" in that their have a child
    // that is dirty, which means we need to reconcile
    // the given sub-tree to find the dirty node.
    this._dirtySubTrees = new Set();
    // Used to mark as needing a full reconciliation
    this._isDirty = false;
  }
  hasDirtyNodes(): boolean {
    return this._dirtyNodes.size > 0;
  }
  getDirtyNodes(): Array<OutlineNode> {
    const dirtyNodes = Array.from(this._dirtyNodes);
    const nodeMap = this._nodeMap;
    const nodes = [];

    for (let i = 0; i < dirtyNodes.length; i++) {
      const dirtyNodeKey = dirtyNodes[i];
      const dirtyNode = nodeMap[dirtyNodeKey];

      if (dirtyNode !== undefined) {
        nodes.push(dirtyNode);
      }
    }
    return nodes;
  }
  read<V>(callbackFn: (view: View) => V): V {
    return enterViewModelScope(callbackFn, this, null, true);
  }
  stringify(): string {
    const selection = this._selection;
    return JSON.stringify({
      _nodeMap: this._nodeMap,
      _selection:
        selection === null
          ? null
          : {
              anchorKey: selection.anchorKey,
              anchorOffset: selection.anchorOffset,
              focusKey: selection.focusKey,
              focusOffset: selection.focusOffset,
            },
    });
  }
}

export function parseViewModel(
  stringifiedViewModel: string,
  editor: OutlineEditor,
): ViewModel {
  const parsedViewModel: ParsedViewModel = JSON.parse(stringifiedViewModel);
  const nodeMap = {};
  const viewModel = new ViewModel(nodeMap);
  const state = {
    originalSelection: parsedViewModel._selection,
  };
  enterViewModelScope(
    () => {
      const parsedNodeMap = parsedViewModel._nodeMap;
      createNodeFromParse(
        parsedNodeMap.root,
        parsedNodeMap,
        editor,
        null /* parentKey */,
        state,
      );
    },
    viewModel,
    editor,
    false,
  );
  viewModel._selection = createSelectionFromParse(
    state.remappedSelection || state.originalSelection,
  );
  viewModel._isDirty = true;
  return viewModel;
}
