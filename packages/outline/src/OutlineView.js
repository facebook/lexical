// @flow strict-local

import type {BodyNode} from './nodes/OutlineBodyNode';
import type {OutlineEditor} from './OutlineEditor';
import type {Selection} from './OutlineSelection';
import type {Node, NodeKey} from './OutlineNode';

import {reconcileViewModel} from './OutlineReconciler';
import {getSelection} from './OutlineSelection';
import {getNodeByKey} from './OutlineNode';

export type ViewType = {
  getBody: () => BodyNode | null,
  getNodeByKey: (key: NodeKey) => null | HTMLElement,
  getSelection: () => Selection,
};

export type NodeMapType = {[key: NodeKey]: Node};

let activeViewModel = null;

export function getActiveViewModel(): ViewModel {
  if (activeViewModel === null) {
    throw new Error(
      'Unable to find an active draft view model. ' +
        'Editor helpers or node methods can only be used ' +
        'synchronously during the callback of editor.createViewModel().',
    );
  }
  return activeViewModel;
}

const view: ViewType = {
  getBody() {
    return getActiveViewModel().body;
  },
  getNodeByKey,
  getSelection,
};

export function createViewModel(
  currentViewModel: ViewModel,
  callbackFn: (view: ViewType) => void,
  editor: OutlineEditor,
): ViewModel {
  const hasActiveViewModel = activeViewModel !== null;
  const viewModel: ViewModel = hasActiveViewModel
    ? getActiveViewModel()
    : cloneViewModel(currentViewModel);
  activeViewModel = viewModel;
  // Setup the dirty nodes Set, which is required by the
  // view model logic during createViewModel(). This is also used by
  // text transforms.
  const dirtyNodes = (viewModel._dirtyNodes = new Set());
  // This is used during reconcilation and is also temporary.
  // We remove it in updateViewModel.
  viewModel._dirtySubTrees = new Set();
  // This is temporary and is used to assist in selection handling.
  viewModel._editor = editor;
  try {
    callbackFn(view);
    applyTextTransforms(viewModel, editor);
  } finally {
    viewModel._editor = null;
    if (!hasActiveViewModel) {
      activeViewModel = null;
    }
  }
  const selection = viewModel.selection;
  const canUseExistingModel =
    dirtyNodes.size === 0 && (selection === null || !selection._isDirty);
  return canUseExistingModel ? currentViewModel : viewModel;
}

// To optimize things, we only apply transforms to
// dirty text nodes, rather than all text nodes.
export function applyTextTransforms(
  viewModel: ViewModel,
  outlineEditor: OutlineEditor,
): void {
  const textTransformsSet = outlineEditor._textTransforms;
  const dirtyNodes = viewModel._dirtyNodes;
  if (textTransformsSet.size > 0 && dirtyNodes !== null) {
    const textTransforms = Array.from(textTransformsSet);
    const mutatedNodeKeys = Array.from(dirtyNodes);
    const nodeMap = viewModel.nodeMap;

    for (let s = 0; s < mutatedNodeKeys.length; s++) {
      const mutatedNodeKey = mutatedNodeKeys[s];
      const node = nodeMap[mutatedNodeKey];
      if (node != null) {
        if (node.isText()) {
          for (let i = 0; i < textTransforms.length; i++) {
            textTransforms[i](node, view);
          }
        }
      }
    }
  }
}

export function updateViewModel(
  viewModel: ViewModel,
  outlineEditor: OutlineEditor,
): void {
  const onChange = outlineEditor._onChange;
  activeViewModel = viewModel;
  reconcileViewModel(viewModel, outlineEditor);
  activeViewModel = null;
  outlineEditor._viewModel = viewModel;
  viewModel._dirtyNodes = null;
  viewModel._dirtySubTrees = null;
  if (typeof onChange === 'function') {
    onChange(viewModel);
  }
}

export function cloneViewModel(current: ViewModel): ViewModel {
  const draft = new ViewModel(current.body);
  draft.nodeMap = {...current.nodeMap};
  return draft;
}

export class ViewModel {
  body: BodyNode;
  nodeMap: NodeMapType;
  selection: null | Selection;
  _dirtyNodes: null | Set<NodeKey>;
  _dirtySubTrees: null | Set<NodeKey>;
  _editor: null | OutlineEditor;

  constructor(body: BodyNode) {
    this.body = body;
    this.nodeMap = {};
    this.selection = null;
    // Dirty nodes are nodes that have been added or updated
    // in comparison to the previous view model. We also use
    // this Set for performance optimizations during the
    // production of a draft view model. This field is
    // temporarily used during editor.createViewModel().
    this._dirtyNodes = null;
    // We make nodes as "dirty" in that their have a child
    // that is dirty, which means we need to reconcile
    // the given sub-tree to find the dirty node.
    // This field is temporarily created during editor.createViewModel()
    // and is remove after being passed to editor.update();
    this._dirtySubTrees = new Set();
    // Temporarily store the editor
    this._editor = null;
  }
}
