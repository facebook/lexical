/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {ParsedViewModel} from './OutlineViewModel';
import type {RootNode} from './OutlineRootNode';
import type {OutlineEditor} from './OutlineEditor';
import type {OutlineNode, NodeKey} from './OutlineNode';
import type {Selection} from './OutlineSelection';
import type {
  ParsedNode,
  ParsedNodeMap,
  NodeParserState,
} from './OutlineParsing';

import {updateViewModel} from './OutlineReconciler';
import {
  createSelection,
  getSelection,
  createSelectionFromParse,
  createSelectionAtEnd,
} from './OutlineSelection';
import {isTextNode} from '.';
import {FULL_RECONCILE, NO_DIRTY_NODES} from './OutlineConstants';
import {resetEditor} from './OutlineEditor';
import {initMutationObserver, flushMutations} from './OutlineMutations';
import {
  ViewModel,
  viewModelHasDirtySelection,
  cloneViewModel,
} from './OutlineViewModel';
import {
  scheduleMicroTask,
  getNodeByKey,
  getCompositionKey,
  setCompositionKey,
  getNearestNodeFromDOMNode,
} from './OutlineUtils';
import {
  triggerListeners,
  triggerTextMutationListeners,
} from './OutlineListeners';
import {
  garbageCollectDetachedDecorators,
  garbageCollectDetachedNodes,
} from './OutlineGC';
import {createNodeFromParse} from './OutlineParsing';
import {applySelectionTransforms} from './OutlineSelection';
import invariant from 'shared/invariant';

let activeViewModel = null;
let activeEditor = null;
let isReadOnlyMode = false;
let isProcessingTextNodeTransforms = false;
let isAttemptingToRecoverFromReconcilerError = false;
let isPreparingPendingViewUpdate = false;

export type View = {
  clearSelection(): void,
  getRoot: () => RootNode,
  getNodeByKey: (key: NodeKey) => null | OutlineNode,
  createSelection: () => Selection | null,
  getSelection: () => null | Selection,
  setSelection: (selection: Selection) => void,
  createNodeFromParse: (
    parsedNode: ParsedNode,
    parsedNodeMap: ParsedNodeMap,
  ) => OutlineNode,
  markNodeAsDirty: (node: OutlineNode) => void,
  setCompositionKey: (compositionKey: NodeKey | null) => void,
  getCompositionKey: () => null | NodeKey,
  getNearestNodeFromDOMNode: (dom: Node) => null | OutlineNode,
  flushMutations: (mutations: Array<MutationRecord>) => void,
  log: (entry: string) => void,
};

export const view: View = {
  getRoot() {
    // $FlowFixMe: root is always in our Map
    return ((getActiveViewModel()._nodeMap.get('root'): any): RootNode);
  },
  getNodeByKey,
  getSelection,
  createSelection(): Selection | null {
    const root = view.getRoot();
    return createSelectionAtEnd(root);
  },
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
    errorOnReadOnly();
    const editor = getActiveEditor();
    return createNodeFromParse(parsedNode, parsedNodeMap, editor, null);
  },
  markNodeAsDirty(node: OutlineNode): void {
    errorOnReadOnly();
    node.getWritable();
  },
  setCompositionKey(compositionKey: null | NodeKey): void {
    errorOnReadOnly();
    setCompositionKey(compositionKey);
  },
  getCompositionKey,
  getNearestNodeFromDOMNode,
  flushMutations(mutations: Array<MutationRecord>): void {
    errorOnReadOnly();
    const editor = getActiveEditor();
    const observer = editor._observer;
    if (observer !== null) {
      flushMutations(editor, mutations, observer);
    }
  },
  log(entry: string): void {
    errorOnReadOnly();
    const editor = getActiveEditor();
    editor._log.push(entry);
  },
};

export function isViewReadOnlyMode(): boolean {
  return isReadOnlyMode;
}

export function errorOnProcessingTextNodeTransforms(): void {
  if (isProcessingTextNodeTransforms) {
    invariant(
      false,
      'Editor.update() cannot be used within a text node transform.',
    );
  }
}

export function errorOnReadOnly(): void {
  if (isReadOnlyMode) {
    invariant(false, 'Cannot use method in read-only mode.');
  }
}

export function errorOnPreparingPendingViewUpdate(
  fnName: 'Editor.getLatestTextContent()',
): void {
  if (
    isPreparingPendingViewUpdate &&
    fnName === 'Editor.getLatestTextContent()'
  ) {
    invariant(
      false,
      'Editor.getLatestTextContent() can be asynchronous and cannot be used within Editor.update()',
    );
  }
}

export function getActiveViewModel(): ViewModel {
  if (activeViewModel === null) {
    invariant(
      false,
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
    invariant(
      false,
      'Unable to find an active editor. ' +
        'This method can only be used ' +
        'synchronously during the callback of ' +
        'editor.update().',
    );
  }
  return activeEditor;
}

function applyTextTransforms(
  viewModel: ViewModel,
  dirtyNodes: Set<NodeKey>,
  editor: OutlineEditor,
): void {
  const textNodeTransforms = editor._textNodeTransforms;
  if (textNodeTransforms.size > 0) {
    const nodeMap = viewModel._nodeMap;
    const dirtyNodesArr = Array.from(dirtyNodes);
    const transforms = Array.from(textNodeTransforms);

    try {
      isProcessingTextNodeTransforms = true;
      triggerTextMutationListeners(nodeMap, dirtyNodesArr, transforms);
    } finally {
      isProcessingTextNodeTransforms = false;
    }
  }
}

export function parseViewModel(
  stringifiedViewModel: string,
  editor: OutlineEditor,
): ViewModel {
  const parsedViewModel: ParsedViewModel = JSON.parse(stringifiedViewModel);
  const nodeMap = new Map();
  const viewModel = new ViewModel(nodeMap);
  const state: NodeParserState = {
    originalSelection: parsedViewModel._selection,
  };
  const previousActiveViewModel = viewModel;
  const previousReadOnlyMode = isReadOnlyMode;
  const previousActiveEditor = activeEditor;
  activeViewModel = viewModel;
  isReadOnlyMode = false;
  activeEditor = editor;
  try {
    const parsedNodeMap = new Map(parsedViewModel._nodeMap);
    // $FlowFixMe: root always exists in Map
    const parsedRoot = ((parsedNodeMap.get('root'): any): ParsedNode);
    createNodeFromParse(
      parsedRoot,
      parsedNodeMap,
      editor,
      null /* parentKey */,
      state,
    );
  } finally {
    activeViewModel = previousActiveViewModel;
    isReadOnlyMode = previousReadOnlyMode;
    activeEditor = previousActiveEditor;
  }
  viewModel._selection = createSelectionFromParse(
    state.remappedSelection || state.originalSelection,
  );
  return viewModel;
}

// This technically isn't an update but given we need
// exposure to the module's active bindings, we have this
// function here
export function readViewModel<V>(
  viewModel: ViewModel,
  callbackFn: (view: View) => V,
): V {
  const previousActiveViewModel = activeViewModel;
  const previousReadOnlyMode = isReadOnlyMode;
  const previousActiveEditor = activeEditor;
  activeViewModel = viewModel;
  isReadOnlyMode = true;
  activeEditor = null;
  try {
    return callbackFn(view);
  } finally {
    activeViewModel = previousActiveViewModel;
    isReadOnlyMode = previousReadOnlyMode;
    activeEditor = previousActiveEditor;
  }
}

export function commitPendingUpdates(editor: OutlineEditor): void {
  const pendingViewModel = editor._pendingViewModel;
  const rootElement = editor._rootElement;
  if (rootElement === null || pendingViewModel === null) {
    return;
  }
  const currentViewModel = editor._viewModel;
  const currentSelection = currentViewModel._selection;
  const pendingSelection = pendingViewModel._selection;
  const needsUpdate = editor._dirtyType !== NO_DIRTY_NODES;
  editor._pendingViewModel = null;
  editor._viewModel = pendingViewModel;

  const previousActiveViewModel = activeViewModel;
  const previousReadOnlyMode = isReadOnlyMode;
  const previousActiveEditor = activeEditor;
  activeEditor = editor;
  activeViewModel = pendingViewModel;
  isReadOnlyMode = false;

  try {
    updateViewModel(
      rootElement,
      currentViewModel,
      pendingViewModel,
      currentSelection,
      pendingSelection,
      needsUpdate,
      editor,
    );
  } catch (error) {
    // Report errors
    triggerListeners('error', editor, error, error._log);
    // Reset editor and restore incoming view model to the DOM
    if (!isAttemptingToRecoverFromReconcilerError) {
      resetEditor(editor, null, rootElement, pendingViewModel);
      initMutationObserver(editor);
      editor._dirtyType = FULL_RECONCILE;
      isAttemptingToRecoverFromReconcilerError = true;
      editor._log.push('ReconcileRecover');
      commitPendingUpdates(editor);
      isAttemptingToRecoverFromReconcilerError = false;
    }
    return;
  } finally {
    activeViewModel = previousActiveViewModel;
    isReadOnlyMode = previousReadOnlyMode;
    activeEditor = previousActiveEditor;
  }
  if (__DEV__) {
    // Given we can't Object.freeze the nodeMap as it's a Map,
    // we instead replace its set, clear and delete methods.
    const nodeMap = pendingViewModel._nodeMap;
    // $FlowFixMe: this is allowed
    nodeMap.set = () => {
      throw new Error('Cannot call set() on a frozen Outline node map');
    };
    // $FlowFixMe: this is allowed
    nodeMap.clear = () => {
      throw new Error('Cannot call clear() on a frozen Outline node map');
    };
    // $FlowFixMe: this is allowed
    nodeMap.delete = () => {
      throw new Error('Cannot call delete() on a frozen Outline node map');
    };
  }
  const dirtyNodes = editor._dirtyNodes;
  const log = editor._log;

  editor._log = [];
  if (needsUpdate) {
    editor._dirtyType = NO_DIRTY_NODES;
    editor._dirtyNodes = new Set();
    editor._dirtySubTrees = new Set();
  }
  garbageCollectDetachedDecorators(editor, pendingViewModel);
  const pendingDecorators = editor._pendingDecorators;
  if (pendingDecorators !== null) {
    editor._decorators = pendingDecorators;
    editor._pendingDecorators = null;
    triggerListeners('decorator', editor, pendingDecorators);
  }
  const isViewModelDirty =
    needsUpdate ||
    pendingSelection === null ||
    pendingSelection.dirty ||
    !pendingSelection.is(currentSelection);
  triggerListeners('update', editor, {
    viewModel: pendingViewModel,
    dirty: isViewModelDirty,
    dirtyNodes,
    log,
  });
  const deferred = editor._deferred;
  editor._deferred = [];
  if (deferred.length !== 0) {
    for (let i = 0; i < deferred.length; i++) {
      deferred[i]();
    }
  }
}

export function beginUpdate(
  editor: OutlineEditor,
  updateFn: (view: View) => void,
  markAllTextNodesAsDirty: boolean,
  callbackFn?: () => void,
): boolean {
  if (callbackFn) {
    editor._deferred.push(callbackFn);
  }
  let pendingViewModel = editor._pendingViewModel;
  let viewModelWasCloned = false;

  if (pendingViewModel === null) {
    const currentViewModel = editor._viewModel;
    pendingViewModel = editor._pendingViewModel =
      cloneViewModel(currentViewModel);
    viewModelWasCloned = true;
  }

  const previousActiveViewModel = activeViewModel;
  const previousReadOnlyMode = isReadOnlyMode;
  const previousActiveEditor = activeEditor;
  isPreparingPendingViewUpdate = true;
  activeViewModel = pendingViewModel;
  isReadOnlyMode = false;
  activeEditor = editor;

  try {
    if (viewModelWasCloned) {
      pendingViewModel._selection = createSelection(pendingViewModel, editor);
    }
    const startingCompositionKey = editor._compositionKey;
    updateFn(view);
    if (markAllTextNodesAsDirty) {
      const currentViewModel = editor._viewModel;
      const nodeMap = currentViewModel._nodeMap;
      const pendingNodeMap = pendingViewModel._nodeMap;
      const nodeMapEntries = Array.from(nodeMap);
      // For...of would be faster here, but this will get
      // compiled away to a slow-path with Babel.
      for (let i = 0; i < nodeMapEntries.length; i++) {
        const [nodeKey, node] = nodeMapEntries[i];
        if (isTextNode(node) && pendingNodeMap.has(nodeKey)) {
          node.getWritable();
        }
      }
    }
    applySelectionTransforms(pendingViewModel, editor);
    if (editor._dirtyType !== NO_DIRTY_NODES) {
      const dirtyNodes = editor._dirtyNodes;
      if (pendingViewModel.isEmpty()) {
        invariant(
          false,
          'updateEditor: the pending view model is empty. Ensure the root not never becomes empty from an update.',
        );
      }
      applyTextTransforms(pendingViewModel, dirtyNodes, editor);
      garbageCollectDetachedNodes(pendingViewModel, dirtyNodes, editor);
    }
    const endingCompositionKey = editor._compositionKey;
    if (startingCompositionKey !== endingCompositionKey) {
      pendingViewModel._flushSync = true;
    }
    const pendingSelection = pendingViewModel._selection;
    if (pendingSelection !== null) {
      const pendingNodeMap = pendingViewModel._nodeMap;
      const anchorKey = pendingSelection.anchor.key;
      const focusKey = pendingSelection.focus.key;
      if (
        pendingNodeMap.get(anchorKey) === undefined ||
        pendingNodeMap.get(focusKey) === undefined
      ) {
        invariant(
          false,
          'updateEditor: selection has been lost because the previously selected nodes have been removed and ' +
            "selection wasn't moved to another node. Ensure selection changes after removing/replacing a selected node.",
        );
      }
    }
  } catch (error) {
    // Report errors
    triggerListeners('error', editor, error, editor._log);
    // Restore existing view model to the DOM
    const currentViewModel = editor._viewModel;
    editor._pendingViewModel = currentViewModel;
    editor._dirtyType = FULL_RECONCILE;
    editor._dirtyNodes = new Set();
    editor._dirtySubTrees = new Set();
    editor._log.push('UpdateRecover');
    commitPendingUpdates(editor);
    return false;
  } finally {
    activeViewModel = previousActiveViewModel;
    isReadOnlyMode = previousReadOnlyMode;
    activeEditor = previousActiveEditor;
    isPreparingPendingViewUpdate = false;
  }

  const shouldUpdate =
    editor._dirtyType !== NO_DIRTY_NODES ||
    viewModelHasDirtySelection(pendingViewModel, editor);

  if (!shouldUpdate) {
    if (viewModelWasCloned) {
      editor._pendingViewModel = null;
    }
    return false;
  }
  if (pendingViewModel._flushSync) {
    pendingViewModel._flushSync = false;
    commitPendingUpdates(editor);
  } else if (viewModelWasCloned) {
    scheduleMicroTask(() => {
      commitPendingUpdates(editor);
    });
  }
  return true;
}
