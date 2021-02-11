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
import type {OutlineNode, NodeKey} from './OutlineNode';
import type {Selection} from './OutlineSelection';
import type {Node as ReactNode} from 'react';

import {reconcileViewModel} from './OutlineReconciler';
import {getSelection} from './OutlineSelection';
import {getNodeByKey} from './OutlineNode';
import {TextNode} from '.';
import {invariant} from './OutlineUtils';

export type View = {
  clearSelection(): void,
  getRoot: () => RootNode,
  getNodeByKey: (key: NodeKey) => null | OutlineNode,
  getSelection: () => null | Selection,
  setSelection: (selection: Selection) => void,
};

export type NodeMapType = {root: RootNode, [key: NodeKey]: OutlineNode};

let activeViewModel = null;
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

const view: View = {
  getRoot() {
    return getActiveViewModel().nodeMap.root;
  },
  getNodeByKey,
  getSelection,
  clearSelection(): void {
    const viewModel = getActiveViewModel();
    viewModel.selection = null;
  },
  setSelection(selection: Selection): void {
    const viewModel = getActiveViewModel();
    viewModel.selection = selection;
  },
};

export function viewModelHasDirtySelectionOrNeedsSync(
  viewModel: ViewModel,
  editor: OutlineEditor,
): boolean {
  const selection = viewModel.selection;
  const currentSelection = editor.getViewModel().selection;
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
  readOnly: boolean,
): V {
  const previousActiveViewModel = activeViewModel;
  const previousReadyOnlyMode = activeReadyOnlyMode;
  activeViewModel = viewModel;
  activeReadyOnlyMode = readOnly;
  try {
    return callbackFn(view);
  } finally {
    activeViewModel = previousActiveViewModel;
    activeReadyOnlyMode = previousReadyOnlyMode;
  }
}

// To optimize things, we only apply transforms to
// dirty text nodes, rather than all text nodes.
export function applyTextTransforms(
  viewModel: ViewModel,
  editor: OutlineEditor,
): void {
  const textTransformsSet = editor._textTransforms;
  if (textTransformsSet.size > 0) {
    const nodeMap = viewModel.nodeMap;
    const dirtyNodes = Array.from(viewModel.dirtyNodes);
    const textTransforms = Array.from(textTransformsSet);

    for (let s = 0; s < dirtyNodes.length; s++) {
      const nodeKey = dirtyNodes[s];
      const node = nodeMap[nodeKey];

      if (node !== undefined && node.isAttached()) {
        // Apply text transforms
        if (node instanceof TextNode) {
          for (let i = 0; i < textTransforms.length; i++) {
            textTransforms[i](node, view);
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
  const dirtyNodes = Array.from(viewModel.dirtyNodes);
  const nodeMap = viewModel.nodeMap;
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
  editor._pendingViewModel = null;
  const previousActiveViewModel = activeViewModel;
  activeViewModel = pendingViewModel;
  reconcileViewModel(pendingViewModel, editor);
  activeViewModel = previousActiveViewModel;
  if (
    pendingViewModel.selection === null &&
    pendingViewModel.nodeMap.root.__children.length !== 0
  ) {
    pendingViewModel.selection = editor._viewModel.selection;
  }
  editor._viewModel = pendingViewModel;
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
  const draft = new ViewModel({...current.nodeMap});
  return draft;
}

export class ViewModel {
  nodeMap: NodeMapType;
  selection: null | Selection;
  dirtyNodes: Set<NodeKey>;
  dirtySubTrees: Set<NodeKey>;
  isHistoric: boolean;
  hasContent: boolean;

  constructor(nodeMap: NodeMapType) {
    this.nodeMap = nodeMap;
    this.selection = null;
    // Dirty nodes are nodes that have been added or updated
    // in comparison to the previous view model. We also use
    // this Set for performance optimizations during the
    // production of a draft view model and during undo/redo.
    this.dirtyNodes = new Set();
    // We make nodes as "dirty" in that their have a child
    // that is dirty, which means we need to reconcile
    // the given sub-tree to find the dirty node.
    this.dirtySubTrees = new Set();
    // Used for undo/redo logic
    this.isHistoric = false;
    // A flag to tell if the view model has content
    this.hasContent = false;
  }
  hasDirtyNodes(): boolean {
    return this.dirtyNodes.size > 0;
  }
  getDirtyNodes(): Array<OutlineNode> {
    const dirtyNodes = Array.from(this.dirtyNodes);
    const nodeMap = this.nodeMap;
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
    return enterViewModelScope(callbackFn, this, true);
  }
}
