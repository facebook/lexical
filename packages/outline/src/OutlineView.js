import {reconcileViewModel} from './OutlineReconciler';
import {getSelection} from './OutlineSelection';
import {getNodeByKey} from './OutlineNode';

let activeViewModel = null;

export function getActiveViewModel() {
  if (activeViewModel === null) {
    throw new Error(
      'Unable to find an active draft view model. ' +
        'Editor helpers or node methods can only be used ' +
        'synchronously during the callback of editor.createViewModel().',
    );
  }
  return activeViewModel;
}

const view = {
  // cloneText(node, text) {
  //   if (node.isImmutable()) {
  //     throw new Error('cloneText: cannot clone an immutable node');
  //   }
  //   const clone = cloneNode(node);
  //   clone._key = null;
  //   if (text !== undefined) {
  //     clone._children = text;
  //   }
  //   return clone;
  // },
  // createBlock: createBlockNode,
  // createText: createTextNode,
  getBody() {
    return getActiveViewModel().body;
  },
  getNodeByKey,
  getSelection,
};

export function createViewModel(currentViewModel, callbackFn, editor) {
  const hasActiveViewModel = activeViewModel !== null;
  const viewModel = hasActiveViewModel
    ? activeViewModel
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
  const canUseExistingModel = dirtyNodes.size === 0;
  return canUseExistingModel ? currentViewModel : viewModel;
}

// To optimize things, we only apply transforms to
// dirty text nodes, rather than all text nodes.
export function applyTextTransforms(viewModel, outlineEditor) {
  const textTransformsSet = outlineEditor._textTransforms;
  if (textTransformsSet.size > 0) {
    const textTransforms = Array.from(textTransformsSet);
    const mutatedNodeKeys = Array.from(viewModel._dirtyNodes);
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

export function updateViewModel(viewModel, outlineEditor) {
  const onChange = outlineEditor._onChange;
  viewModel._dirtyNodes = null;
  // We shouldn't need to set activeViewModel again here,
  // but because we access getNextSibling() to find out if
  // a text node should add a new line, we re-use it.
  // Ideally we'd instead have a _nextSibling property
  // on the node rather than having to lookup the parent.
  activeViewModel = viewModel;
  reconcileViewModel(viewModel, outlineEditor);
  activeViewModel = null;
  outlineEditor._viewModel = viewModel;
  viewModel._dirtySubTrees = null;
  if (typeof onChange === 'function') {
    onChange(viewModel);
  }
}

export function cloneViewModel(current) {
  const draft = new ViewModel();
  draft.nodeMap = {...current.nodeMap};
  draft.body = current.body;
  return draft;
}

export function ViewModel() {
  this.body = null;
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
