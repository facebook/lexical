// @flow strict

import type {RootNode} from './OutlineRootNode';
import type {OutlineEditor} from './OutlineEditor';
import type {Selection} from './OutlineSelection';
import type {Node, NodeKey} from './OutlineNode';

import {reconcileViewModel} from './OutlineReconciler';
import {getSelection} from './OutlineSelection';
import {getNodeByKey} from './OutlineNode';
import {TextNode} from '.';
import {invariant} from './OutlineUtils';

export type ViewType = {
  getRoot: () => RootNode,
  getNodeByKey: (key: NodeKey) => null | Node,
  getSelection: () => null | Selection,
};

export type NodeMapType = {[key: NodeKey]: Node};

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
        'Editor helpers or node methods can only be used ' +
        'synchronously during the callback of editor.draft().',
    );
  }
  return activeViewModel;
}

export function getActiveEditor(): OutlineEditor {
  if (activeEditor === null) {
    throw new Error(
      'Unable to find an active editor. ' +
        'Editor helpers or node methods can only be used ' +
        'synchronously during the callback of editor.draft().',
    );
  }
  return activeEditor;
}

const view: ViewType = {
  getRoot() {
    return getActiveViewModel().root;
  },
  getNodeByKey,
  getSelection,
};

export function draftViewModel(
  currentViewModel: ViewModel,
  callbackFn: (view: ViewType) => void,
  editor: OutlineEditor,
): ViewModel {
  const hasActiveViewModel = activeViewModel !== null;
  const viewModel: ViewModel = hasActiveViewModel
    ? getActiveViewModel()
    : cloneViewModel(currentViewModel);
  callCallbackWithViewModelScope(
    (v: ViewType) => {
      callbackFn(v);
      if (viewModel.hasDirtyNodes()) {
        applyTextTransforms(viewModel, editor);
        garbageCollectDetachedNodes(viewModel);
      }
    },
    viewModel,
    editor,
    false,
  );

  const canUseExistingModel =
    !viewModel.hasDirtyNodes() && !viewModel.hasDirtySelection();
  return canUseExistingModel ? currentViewModel : viewModel;
}

export function readViewModel(
  viewModel: ViewModel,
  callbackFn: (view: ViewType) => void,
  editor: OutlineEditor,
) {
  invariant(
    activeViewModel === null,
    'read: cannot be used during the creation of a draft',
  );
  callCallbackWithViewModelScope(callbackFn, viewModel, editor, true);
}

function callCallbackWithViewModelScope(
  callbackFn: (view: ViewType) => void,
  viewModel: ViewModel,
  editor: OutlineEditor,
  readOnly: boolean,
): void {
  const previousActiveViewModel = activeViewModel;
  const previousActiveEditor = activeEditor;
  const previousReadyOnlyMode = activeReadyOnlyMode;
  activeViewModel = viewModel;
  activeEditor = editor;
  activeReadyOnlyMode = readOnly;
  callbackFn(view);
  activeViewModel = previousActiveViewModel;
  activeEditor = previousActiveEditor;
  activeReadyOnlyMode = previousReadyOnlyMode;
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
          }
        }
      }
    }
  }
}

export function garbageCollectDetachedNodes(viewModel: ViewModel): void {
  const dirtyNodes = Array.from(viewModel.dirtyNodes);
  const nodeMap = viewModel.nodeMap;

  for (let s = 0; s < dirtyNodes.length; s++) {
    const nodeKey = dirtyNodes[s];
    const node = nodeMap[nodeKey];

    if (node !== undefined && !node.isAttached()) {
      // Garbage collect node
      delete nodeMap[nodeKey];
    }
  }
}

export function updateViewModel(
  viewModel: ViewModel,
  editor: OutlineEditor,
): void {
  const previousActiveViewModel = activeViewModel;
  const previousActiveEditor = activeEditor;
  activeViewModel = viewModel;
  activeEditor = editor;
  reconcileViewModel(viewModel, editor);
  activeViewModel = previousActiveViewModel;
  activeEditor = previousActiveEditor;
  editor._viewModel = viewModel;
  triggerOnChange(editor);
}

export function triggerOnChange(editor: OutlineEditor): void {
  const listeners = Array.from(editor._updateListeners);
  const viewModel = editor.getCurrentViewModel();
  for (let i = 0; i < listeners.length; i++) {
    listeners[i](viewModel);
  }
}

export function cloneViewModel(current: ViewModel): ViewModel {
  const draft = new ViewModel(current.root);
  draft.nodeMap = {...current.nodeMap};
  return draft;
}

export class ViewModel {
  root: RootNode;
  nodeMap: NodeMapType;
  selection: null | Selection;
  dirtyNodes: Set<NodeKey>;
  dirtySubTrees: Set<NodeKey>;
  isHistoric: boolean;

  constructor(root: RootNode) {
    this.root = root;
    this.nodeMap = {};
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
  }
  hasDirtyNodes(): boolean {
    return this.dirtyNodes.size > 0;
  }
  hasDirtySelection(): boolean {
    const selection = this.selection;
    return selection !== null && selection._isDirty;
  }
  getDirtyNodes(): Array<Node> {
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
}
