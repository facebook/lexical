/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {RootNode} from './OutlineRootNode';
import type {OutlineEditor, TextNodeTransform} from './OutlineEditor';
import type {OutlineNode, NodeKey, ParsedNode, NodeMap} from './OutlineNode';
import type {BlockNode} from './OutlineBlockNode';
import type {Selection} from './OutlineSelection';
import type {ParsedNodeMap} from './OutlineNode';
import type {ListenerType} from './OutlineEditor';

import {cloneDecorators, updateViewModel} from './OutlineReconciler';
import {
  createSelection,
  getSelection,
  createSelectionFromParse,
  createSelectionAtEnd,
} from './OutlineSelection';
import {
  getNodeByKey,
  createNodeFromParse,
  setCompositionKey,
  getCompositionKey,
  getNearestNodeFromDOMNode,
} from './OutlineNode';
import {isBlockNode, isTextNode, isLineBreakNode} from '.';
import {FULL_RECONCILE, NO_DIRTY_NODES} from './OutlineConstants';
import {resetEditor} from './OutlineEditor';
import {initMutationObserver, flushMutations} from './OutlineMutations';
import {createRootNode} from './OutlineRootNode';
import invariant from 'shared/invariant';

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
};

export type ParsedViewModel = {
  _selection: null | {
    anchor: {
      key: string,
      offset: number,
      type: 'text' | 'block',
    },
    focus: {
      key: string,
      offset: number,
      type: 'text' | 'block',
    },
  },
  _nodeMap: Array<[NodeKey, ParsedNode]>,
};

let activeViewModel = null;
let activeEditor = null;
let isReadOnlyMode = false;
let isProcessingTextNodeTransforms = false;
let isAttemptingToRecoverFromReconcilerError = false;

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
};
export function viewModelHasDirtySelection(
  viewModel: ViewModel,
  editor: OutlineEditor,
): boolean {
  const currentSelection = editor.getViewModel()._selection;
  const pendingSelection = viewModel._selection;
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

export function preparePendingViewUpdate(
  pendingViewModel: ViewModel,
  updateFn: (view: View) => void,
  viewModelWasCloned: boolean,
  markAllTextNodesAsDirty: boolean,
  editor: OutlineEditor,
): null | Error {
  const previousActiveViewModel = activeViewModel;
  const previousReadOnlyMode = isReadOnlyMode;
  const previousActiveEditor = activeEditor;
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
  } catch (e) {
    return e;
  } finally {
    activeViewModel = previousActiveViewModel;
    isReadOnlyMode = previousReadOnlyMode;
    activeEditor = previousActiveEditor;
  }
  return null;
}

function triggerTextMutationListeners(
  nodeMap: NodeMap,
  dirtyNodes: Array<NodeKey>,
  transforms: Array<TextNodeTransform>,
): void {
  const compositionKey = getCompositionKey();
  for (let s = 0; s < dirtyNodes.length; s++) {
    const nodeKey = dirtyNodes[s];

    const node = nodeMap.get(nodeKey);

    if (
      node !== undefined &&
      isTextNode(node) &&
      // We don't want to transform nodes being composed
      node.__key !== compositionKey &&
      !isLineBreakNode(node) &&
      node.isAttached() &&
      // You shouldn't be able to transform these types of
      // nodes.
      !node.isImmutable() &&
      !node.isSegmented()
    ) {
      // Apply text transforms
      for (let i = 0; i < transforms.length; i++) {
        transforms[i](node, view);
        if (!node.isAttached()) {
          break;
        }
      }
    }
  }
}

export function applySelectionTransforms(
  nextViewModel: ViewModel,
  editor: OutlineEditor,
): void {
  const prevViewModel = editor.getViewModel();
  const prevSelection = prevViewModel._selection;
  const nextSelection = nextViewModel._selection;
  if (nextSelection !== null) {
    const anchor = nextSelection.anchor;
    const focus = nextSelection.focus;
    let anchorNode;

    if (anchor.type === 'text') {
      anchorNode = anchor.getNode();
      anchorNode.selectionTransform(prevSelection, nextSelection);
    }
    if (focus.type === 'text') {
      const focusNode = focus.getNode();
      if (anchorNode !== focusNode) {
        focusNode.selectionTransform(prevSelection, nextSelection);
      }
    }
  }
}

export function applyTextTransforms(
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

function garbageCollectDetachedDecorators(
  editor: OutlineEditor,
  pendingViewModel: ViewModel,
): void {
  const currentDecorators = editor._decorators;
  const pendingDecorators = editor._pendingDecorators;
  let decorators = pendingDecorators || currentDecorators;
  const nodeMap = pendingViewModel._nodeMap;
  let key;
  for (key in decorators) {
    if (!nodeMap.has(key)) {
      if (decorators === currentDecorators) {
        decorators = cloneDecorators(editor);
      }
      delete decorators[key];
    }
  }
}

function garbageCollectDetachedDeepChildNodes(
  node: BlockNode,
  parentKey: NodeKey,
  nodeMap: NodeMap,
): void {
  const children = node.__children;
  const childrenLength = children.length;
  for (let i = 0; i < childrenLength; i++) {
    const childKey = children[i];
    const child = nodeMap.get(childKey);
    if (child !== undefined && child.__parent === parentKey) {
      if (isBlockNode(child)) {
        garbageCollectDetachedDeepChildNodes(child, childKey, nodeMap);
      }
      nodeMap.delete(childKey);
    }
  }
}

export function garbageCollectDetachedNodes(
  viewModel: ViewModel,
  dirtyNodes: Set<NodeKey>,
  editor: OutlineEditor,
): void {
  const dirtyNodesArr = Array.from(dirtyNodes);
  const nodeMap = viewModel._nodeMap;

  for (let s = 0; s < dirtyNodesArr.length; s++) {
    const nodeKey = dirtyNodesArr[s];
    const node = nodeMap.get(nodeKey);

    if (node !== undefined) {
      // Garbage collect node and its children if they exist
      if (!node.isAttached()) {
        if (isBlockNode(node)) {
          garbageCollectDetachedDeepChildNodes(node, nodeKey, nodeMap);
        }
        nodeMap.delete(nodeKey);
      }
    }
  }
}

export function commitPendingUpdates(
  editor: OutlineEditor,
  updateName: string,
): void {
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
    triggerListeners('error', editor, error, updateName);
    // Reset editor and restore incoming view model to the DOM
    if (!isAttemptingToRecoverFromReconcilerError) {
      resetEditor(editor, null, rootElement, pendingViewModel);
      initMutationObserver(editor);
      editor._dirtyType = FULL_RECONCILE;
      isAttemptingToRecoverFromReconcilerError = true;
      commitPendingUpdates(editor, 'ReconcileRecover');
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
  });
  const deferred = editor._deferred;
  editor._deferred = [];
  if (deferred.length !== 0) {
    for (let i = 0; i < deferred.length; i++) {
      deferred[i]();
    }
  }
}

export function triggerListeners(
  type: ListenerType,
  editor: OutlineEditor,
  // $FlowFixMe: needs refining
  ...payload: Array<any>
): void {
  const listeners = Array.from(editor._listeners[type]);
  for (let i = 0; i < listeners.length; i++) {
    listeners[i](...payload);
  }
}

export function cloneViewModel(current: ViewModel): ViewModel {
  const draft = new ViewModel(new Map(current._nodeMap));
  return draft;
}

export function createEmptyViewModel(): ViewModel {
  return new ViewModel(new Map([['root', createRootNode()]]));
}

export class ViewModel {
  _nodeMap: NodeMap;
  _selection: null | Selection;
  _flushSync: boolean;

  constructor(nodeMap: NodeMap) {
    this._nodeMap = nodeMap;
    this._selection = null;
    this._flushSync = false;
  }
  isEmpty(): boolean {
    return this._nodeMap.size === 1 && this._selection === null;
  }
  read<V>(callbackFn: (view: View) => V): V {
    const previousActiveViewModel = activeViewModel;
    const previousReadOnlyMode = isReadOnlyMode;
    const previousActiveEditor = activeEditor;
    activeViewModel = (this: ViewModel);
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
  stringify(space?: string | number): string {
    const selection = this._selection;
    return JSON.stringify(
      {
        _nodeMap: Array.from(this._nodeMap.entries()),
        _selection:
          selection === null
            ? null
            : {
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
              },
      },
      null,
      space,
    );
  }
}

export function parseViewModel(
  stringifiedViewModel: string,
  editor: OutlineEditor,
): ViewModel {
  const parsedViewModel: ParsedViewModel = JSON.parse(stringifiedViewModel);
  const nodeMap = new Map();
  const viewModel = new ViewModel(nodeMap);
  const state = {
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
