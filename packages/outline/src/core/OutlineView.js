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
import type {
  OutlineNode,
  NodeKey,
  ParsedNode,
  NodeMapType,
} from './OutlineNode';
import type {BlockNode} from './OutlineBlockNode';
import type {Selection} from './OutlineSelection';
import type {ParsedNodeMap} from './OutlineNode';
import type {ListenerType} from './OutlineEditor';

import {cloneDecorators, reconcileViewModel} from './OutlineReconciler';
import {
  createSelection,
  getSelection,
  createSelectionFromParse,
} from './OutlineSelection';
import {
  getNodeByKey,
  createNodeFromParse,
  setCompositionKey,
  getCompositionKey,
} from './OutlineNode';
import {isBlockNode, isTextNode, isLineBreakNode} from '.';
import invariant from 'shared/invariant';
import {resetEditor} from './OutlineEditor';

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
  markNodeAsDirty: (node: OutlineNode) => void,
  setCompositionKey: (compositionKey: NodeKey | null) => void,
  getCompositionKey: () => null | NodeKey,
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
        'View methods or node methods can only be used ' +
        'synchronously during the callback of ' +
        'editor.update() or viewModel.read().',
    );
  }
  return activeEditor;
}

const view: View = {
  getRoot() {
    // $FlowFixMe: root is always in our Map
    return ((getActiveViewModel()._nodeMap.get('root'): any): RootNode);
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
    errorOnReadOnly();
    const editor = getActiveEditor();
    return createNodeFromParse(parsedNode, parsedNodeMap, editor, null);
  },
  markNodeAsDirty(node: OutlineNode): void {
    node.getWritable();
  },
  setCompositionKey,
  getCompositionKey,
};

export function viewModelHasDirtySelection(
  viewModel: ViewModel,
  editor: OutlineEditor,
): boolean {
  const currentSelection = editor.getViewModel()._selection;
  const pendingSelection = viewModel._selection;
  // Check if we need to update because of changes in selection
  if (pendingSelection !== null) {
    if (
      currentSelection === null ||
      pendingSelection.isDirty ||
      !pendingSelection.is(currentSelection)
    ) {
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
    const dirtyNodes = editor._dirtyNodes;
    if (dirtyNodes !== null && dirtyNodes.size > 0) {
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
  nodeMap: NodeMapType,
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
  nodeMap: NodeMapType,
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
  editor._pendingViewModel = null;
  editor._viewModel = pendingViewModel;
  const previousActiveViewModel = activeViewModel;
  const previousReadOnlyMode = isReadOnlyMode;
  const previousActiveEditor = activeEditor;
  activeEditor = editor;
  activeViewModel = pendingViewModel;
  isReadOnlyMode = false;
  try {
    reconcileViewModel(rootElement, currentViewModel, pendingViewModel, editor);
  } catch (error) {
    // Report errors
    triggerListeners('error', editor, error, updateName);
    // Reset editor and restore incoming view model to the DOM
    if (!isAttemptingToRecoverFromReconcilerError) {
      resetEditor(editor);
      editor._keyToDOMMap.set('root', rootElement);
      editor._pendingViewModel = pendingViewModel;
      editor._dirtyNodes = null;
      editor._dirtySubTrees = null;
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
  const dirtyNodes = editor._dirtyNodes;
  editor._dirtyNodes = null;
  editor._dirtySubTrees = null;
  garbageCollectDetachedDecorators(editor, pendingViewModel);
  const pendingDecorators = editor._pendingDecorators;
  if (pendingDecorators !== null) {
    editor._decorators = pendingDecorators;
    editor._pendingDecorators = null;
    triggerListeners('decorator', editor, pendingDecorators);
  }
  triggerListeners('update', editor, pendingViewModel, dirtyNodes);
  const deferred = editor._deferred;
  if (deferred.length !== 0) {
    for (let i = 0; i < deferred.length; i++) {
      deferred[i]();
    }
    editor._deferred = [];
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

export class ViewModel {
  _nodeMap: NodeMapType;
  _selection: null | Selection;
  _flushSync: boolean;

  constructor(nodeMap: NodeMapType) {
    this._nodeMap = nodeMap;
    this._selection = null;
    this._flushSync = false;
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
