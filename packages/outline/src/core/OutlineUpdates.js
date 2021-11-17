/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {ParsedEditorState} from './OutlineEditorState';
import type {RootNode} from './OutlineRootNode';
import type {BlockNode} from './OutlineBlockNode';
import type {OutlineEditor, ListenerType} from './OutlineEditor';
import type {OutlineNode, NodeKey} from './OutlineNode';
import type {Selection} from './OutlineSelection';
import type {ParsedNode, NodeParserState} from './OutlineParsing';
import type {TextNode} from './OutlineTextNode';
import type {DecoratorNode} from './OutlineDecoratorNode';

import {updateEditorState} from './OutlineReconciler';
import {
  createSelection,
  getSelection,
  createSelectionFromParse,
} from './OutlineSelection';
import {FULL_RECONCILE, NO_DIRTY_NODES} from './OutlineConstants';
import {resetEditor} from './OutlineEditor';
import {initMutationObserver, flushRootMutations} from './OutlineMutations';
import {
  EditorState,
  editorStateHasDirtySelection,
  cloneEditorState,
} from './OutlineEditorState';
import {
  scheduleMicroTask,
  getNodeByKey,
  getCompositionKey,
  setCompositionKey,
  getNearestNodeFromDOMNode,
  getEditorStateTextContent,
} from './OutlineUtils';
import {
  garbageCollectDetachedDecorators,
  garbageCollectDetachedNodes,
} from './OutlineGC';
import {internalCreateNodeFromParse} from './OutlineParsing';
import {applySelectionTransforms} from './OutlineSelection';
import {isTextNode, isRootNode, isBlockNode, isDecoratorNode} from '.';
import invariant from 'shared/invariant';

let activeEditorState: null | EditorState = null;
let activeEditor: null | OutlineEditor = null;
let isEnqueuingUpdates: boolean = false;
let isReadOnlyMode: boolean = false;
let isAttemptingToRecoverFromReconcilerError: boolean = false;

export type State = {
  clearSelection(): void,
  getRoot: () => RootNode,
  getNodeByKey: (key: NodeKey) => null | OutlineNode,
  getSelection: () => null | Selection,
  setSelection: (selection: Selection) => void,
  setCompositionKey: (compositionKey: NodeKey | null) => void,
  getCompositionKey: () => null | NodeKey,
  getNearestNodeFromDOMNode: (dom: Node) => null | OutlineNode,
  flushMutations: () => void,
};

export const state: State = {
  getRoot() {
    // $FlowFixMe: root is always in our Map
    return ((getActiveEditorState()._nodeMap.get('root'): any): RootNode);
  },
  getNodeByKey,
  getSelection,
  clearSelection(): void {
    const editorState = getActiveEditorState();
    editorState._selection = null;
  },
  setSelection(selection: Selection): void {
    const editorState = getActiveEditorState();
    editorState._selection = selection;
  },
  setCompositionKey(compositionKey: null | NodeKey): void {
    errorOnReadOnly();
    setCompositionKey(compositionKey);
  },
  getCompositionKey,
  getNearestNodeFromDOMNode,
  flushMutations(): void {
    errorOnReadOnly();
    const editor = getActiveEditor();
    flushRootMutations(editor);
  },
};

export function isCurrentlyReadOnlyMode(): boolean {
  return isReadOnlyMode;
}

export function shouldEnqueueUpdates(): boolean {
  return isEnqueuingUpdates;
}

export function errorOnReadOnly(): void {
  if (isReadOnlyMode) {
    invariant(false, 'Cannot use method in read-only mode.');
  }
}

export function getActiveEditorState(): EditorState {
  if (activeEditorState === null) {
    invariant(
      false,
      'Unable to find an active editor state. ' +
        'State helpers or node methods can only be used ' +
        'synchronously during the callback of ' +
        'editor.update() or editorState.read().',
    );
  }
  return activeEditorState;
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

export function applyTransforms<N: OutlineNode>(
  node: N,
  transformsArr: Array<(N, State) => void>,
  transformsArrLength: number,
): void {
  for (let i = 0; i < transformsArrLength; i++) {
    transformsArr[i](node, state);
    if (!node.isAttached()) {
      break;
    }
  }
}

function isNodeValidForTransform(
  node: void | OutlineNode,
  compositionKey: null | string,
): boolean {
  return (
    node !== undefined &&
    // We don't want to transform nodes being composed
    node.__key !== compositionKey &&
    node.isAttached() &&
    // You shouldn't be able to transform these types of
    // nodes.
    !node.isImmutable() &&
    !node.isSegmented()
  );
}

function applyAllTransforms(
  editorState: EditorState,
  dirtyNodes: Set<NodeKey>,
  dirtyBlocks: Map<NodeKey, number>,
  editor: OutlineEditor,
): void {
  const transforms = editor._transforms;
  const textTransforms = transforms.text;
  const decoratorTransforms = transforms.decorator;
  const blockTransforms = transforms.block;
  const rootTransforms = transforms.root;
  const nodeMap = editorState._nodeMap;
  const compositionKey = getCompositionKey();

  if (textTransforms.size > 0 || decoratorTransforms.size > 0) {
    const dirtyNodesArr = Array.from(dirtyNodes);
    const textTransformsArr = Array.from(textTransforms);
    const decoratorTransformsArr = Array.from(decoratorTransforms);
    const textTransformsArrLength = textTransformsArr.length;
    const decoratorTransformsArrLength = decoratorTransformsArr.length;
    for (let s = 0; s < dirtyNodesArr.length; s++) {
      const nodeKey = dirtyNodesArr[s];
      const node = nodeMap.get(nodeKey);

      if (isNodeValidForTransform(node, compositionKey)) {
        if (isTextNode(node)) {
          // Apply text transforms
          applyTransforms<TextNode>(
            node,
            textTransformsArr,
            textTransformsArrLength,
          );
        } else if (isDecoratorNode(node)) {
          // Apply decorator transforms
          applyTransforms<DecoratorNode>(
            node,
            decoratorTransformsArr,
            decoratorTransformsArrLength,
          );
        }
      }
    }
  }
  if (blockTransforms.size > 0 || rootTransforms.size > 0) {
    const dirtyNodesArr = Array.from(dirtyBlocks);
    const blockTransformsArr = Array.from(blockTransforms);
    const rootTransformsArr = Array.from(rootTransforms);
    const blockTransformsArrLength = blockTransformsArr.length;
    const rootTransformsArrLength = rootTransformsArr.length;
    // Sort the blocks by their depth, so we deal with deepest first
    dirtyNodesArr.sort((a, b) => b[1] - a[1]);
    for (let s = 0; s < dirtyNodesArr.length; s++) {
      const nodeKey = dirtyNodesArr[s][0];
      const node = nodeMap.get(nodeKey);

      if (isNodeValidForTransform(node, compositionKey)) {
        if (isRootNode(node)) {
          // Apply root transforms
          applyTransforms<RootNode>(
            node,
            rootTransformsArr,
            rootTransformsArrLength,
          );
        } else if (isBlockNode(node)) {
          // Apply block transforms
          applyTransforms<BlockNode>(
            node,
            blockTransformsArr,
            blockTransformsArrLength,
          );
        }
      }
    }
  }
}

export function parseEditorState(
  stringifiedEditorState: string,
  editor: OutlineEditor,
): EditorState {
  const parsedEditorState: ParsedEditorState = JSON.parse(
    stringifiedEditorState,
  );
  const nodeMap = new Map();
  const editorState = new EditorState(nodeMap);
  const nodeParserState: NodeParserState = {
    originalSelection: parsedEditorState._selection,
  };
  const previousActiveEditorState = editorState;
  const previousReadOnlyMode = isReadOnlyMode;
  const previousActiveEditor = activeEditor;
  activeEditorState = editorState;
  isReadOnlyMode = false;
  activeEditor = editor;
  try {
    const parsedNodeMap = new Map(parsedEditorState._nodeMap);
    // $FlowFixMe: root always exists in Map
    const parsedRoot = ((parsedNodeMap.get('root'): any): ParsedNode);
    internalCreateNodeFromParse(
      parsedRoot,
      parsedNodeMap,
      editor,
      null /* parentKey */,
      nodeParserState,
    );
  } finally {
    activeEditorState = previousActiveEditorState;
    isReadOnlyMode = previousReadOnlyMode;
    activeEditor = previousActiveEditor;
  }
  editorState._selection = createSelectionFromParse(
    nodeParserState.remappedSelection || nodeParserState.originalSelection,
  );
  return editorState;
}

// This technically isn't an update but given we need
// exposure to the module's active bindings, we have this
// function here
export function readEditorState<V>(
  editorState: EditorState,
  callbackFn: (state: State) => V,
): V {
  const previousActiveEditorState = activeEditorState;
  const previousReadOnlyMode = isReadOnlyMode;
  const previousActiveEditor = activeEditor;
  activeEditorState = editorState;
  isReadOnlyMode = true;
  activeEditor = null;
  try {
    return callbackFn(state);
  } finally {
    activeEditorState = previousActiveEditorState;
    isReadOnlyMode = previousReadOnlyMode;
    activeEditor = previousActiveEditor;
  }
}

function handleDEVOnlyPendingUpdateGuarantees(
  pendingEditorState: EditorState,
): void {
  // Given we can't Object.freeze the nodeMap as it's a Map,
  // we instead replace its set, clear and delete methods.
  const nodeMap = pendingEditorState._nodeMap;
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

export function commitPendingUpdates(editor: OutlineEditor): void {
  const pendingEditorState = editor._pendingEditorState;
  const rootElement = editor._rootElement;
  if (rootElement === null || pendingEditorState === null) {
    return;
  }
  const currentEditorState = editor._editorState;
  const currentSelection = currentEditorState._selection;
  const pendingSelection = pendingEditorState._selection;
  const needsUpdate = editor._dirtyType !== NO_DIRTY_NODES;
  editor._pendingEditorState = null;
  editor._editorState = pendingEditorState;

  const previousActiveEditorState = activeEditorState;
  const previousReadOnlyMode = isReadOnlyMode;
  const previousActiveEditor = activeEditor;
  const previousShouldEnqueueUpdates = isEnqueuingUpdates;
  activeEditor = editor;
  activeEditorState = pendingEditorState;
  isReadOnlyMode = false;
  // We don't want updates to sync block the reconcilation.
  isEnqueuingUpdates = true;

  try {
    updateEditorState(
      rootElement,
      currentEditorState,
      pendingEditorState,
      currentSelection,
      pendingSelection,
      needsUpdate,
      editor,
    );
  } catch (error) {
    // Report errors
    triggerListeners('error', editor, false, error, error._log);
    // Reset editor and restore incoming editor state to the DOM
    if (!isAttemptingToRecoverFromReconcilerError) {
      resetEditor(editor, null, rootElement, pendingEditorState);
      initMutationObserver(editor);
      editor._dirtyType = FULL_RECONCILE;
      isAttemptingToRecoverFromReconcilerError = true;
      editor._log.push('ReconcileRecover');
      commitPendingUpdates(editor);
      isAttemptingToRecoverFromReconcilerError = false;
    }
    return;
  } finally {
    isEnqueuingUpdates = previousShouldEnqueueUpdates;
    activeEditorState = previousActiveEditorState;
    isReadOnlyMode = previousReadOnlyMode;
    activeEditor = previousActiveEditor;
  }
  if (__DEV__) {
    handleDEVOnlyPendingUpdateGuarantees(pendingEditorState);
  }
  const dirtyNodes = editor._dirtyNodes;
  const log = editor._log;

  editor._log = [];
  if (needsUpdate) {
    editor._dirtyType = NO_DIRTY_NODES;
    editor._dirtyNodes = new Set();
    editor._dirtyBlocks = new Map();
  }
  garbageCollectDetachedDecorators(editor, pendingEditorState);
  const pendingDecorators = editor._pendingDecorators;
  if (pendingDecorators !== null) {
    editor._decorators = pendingDecorators;
    editor._pendingDecorators = null;
    triggerListeners('decorator', editor, true, pendingDecorators);
  }
  triggerTextContentListeners(editor, currentEditorState, pendingEditorState);
  triggerListeners('update', editor, true, {
    prevEditorState: currentEditorState,
    editorState: pendingEditorState,
    dirtyNodes,
    log,
  });
  triggerDeferredUpdateCallbacks(editor);
  triggerEnqueuedUpdates(editor);
}

function triggerTextContentListeners(
  editor: OutlineEditor,
  currentEditorState: EditorState,
  pendingEditorState: EditorState,
): void {
  const currentTextContent = getEditorStateTextContent(currentEditorState);
  const latestTextContent = getEditorStateTextContent(pendingEditorState);
  if (currentTextContent !== latestTextContent) {
    triggerListeners('textcontent', editor, true, latestTextContent);
  }
}

export function triggerListeners(
  type: ListenerType,
  editor: OutlineEditor,
  isCurrentlyEnqueuingUpdates: boolean,
  // $FlowFixMe: needs refining
  ...payload: Array<any>
): void {
  const previousShouldEnqueueUpdates = isEnqueuingUpdates;
  isEnqueuingUpdates = isCurrentlyEnqueuingUpdates;
  try {
    const listeners = Array.from(editor._listeners[type]);
    for (let i = 0; i < listeners.length; i++) {
      listeners[i](...payload);
    }
  } finally {
    isEnqueuingUpdates = previousShouldEnqueueUpdates;
  }
}

function triggerEnqueuedUpdates(editor: OutlineEditor): void {
  const queuedUpdates = editor._updates;
  if (queuedUpdates.length !== 0) {
    const [updateFn, callbackFn] = queuedUpdates.shift();
    beginUpdate(editor, updateFn, callbackFn);
  }
}

function triggerDeferredUpdateCallbacks(editor: OutlineEditor): void {
  const deferred = editor._deferred;
  editor._deferred = [];
  if (deferred.length !== 0) {
    const previousShouldEnqueueUpdates = isEnqueuingUpdates;
    isEnqueuingUpdates = true;
    try {
      for (let i = 0; i < deferred.length; i++) {
        deferred[i]();
      }
    } finally {
      isEnqueuingUpdates = previousShouldEnqueueUpdates;
    }
  }
}

function processNestedUpdates(
  editor: OutlineEditor,
  deferred: Array<() => void>,
): void {
  const queuedUpdates = editor._updates;
  // Updates might grow as we process them, we so we'll need
  // to handle each update as we go until the updates array is
  // empty.
  while (queuedUpdates.length !== 0) {
    const [nextUpdateFn, nextCallbackFn] = queuedUpdates.shift();
    if (nextCallbackFn) {
      deferred.push(nextCallbackFn);
    }
    nextUpdateFn(state);
  }
}

export function beginUpdate(
  editor: OutlineEditor,
  updateFn: (state: State) => void,
  callbackFn?: () => void,
): void {
  const deferred = editor._deferred;
  if (callbackFn) {
    deferred.push(callbackFn);
  }
  const currentEditorState = editor._editorState;
  let pendingEditorState = editor._pendingEditorState;
  let editorStateWasCloned = false;

  if (pendingEditorState === null) {
    pendingEditorState = editor._pendingEditorState =
      cloneEditorState(currentEditorState);
    editorStateWasCloned = true;
  }

  const previousActiveEditorState = activeEditorState;
  const previousReadOnlyMode = isReadOnlyMode;
  const previousActiveEditor = activeEditor;
  const previousShouldEnqueueUpdates = isEnqueuingUpdates;
  activeEditorState = pendingEditorState;
  isReadOnlyMode = false;
  isEnqueuingUpdates = true;
  activeEditor = editor;

  try {
    if (editorStateWasCloned) {
      pendingEditorState._selection = createSelection(editor);
    }
    const startingCompositionKey = editor._compositionKey;
    updateFn(state);
    processNestedUpdates(editor, deferred);
    applySelectionTransforms(pendingEditorState, editor);
    if (editor._dirtyType !== NO_DIRTY_NODES) {
      const dirtyNodes = editor._dirtyNodes;
      const dirtyBlocks = editor._dirtyBlocks;
      if (pendingEditorState.isEmpty()) {
        invariant(
          false,
          'updateEditor: the pending editor state is empty. Ensure the root not never becomes empty from an update.',
        );
      }
      applyAllTransforms(pendingEditorState, dirtyNodes, dirtyBlocks, editor);
      processNestedUpdates(editor, deferred);
      garbageCollectDetachedNodes(
        currentEditorState,
        pendingEditorState,
        dirtyNodes,
        editor,
      );
    }
    const endingCompositionKey = editor._compositionKey;
    if (startingCompositionKey !== endingCompositionKey) {
      pendingEditorState._flushSync = true;
    }
    const pendingSelection = pendingEditorState._selection;
    if (pendingSelection !== null) {
      const pendingNodeMap = pendingEditorState._nodeMap;
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
    triggerListeners('error', editor, false, error, editor._log);
    // Restore existing editor state to the DOM
    editor._pendingEditorState = currentEditorState;
    editor._dirtyType = FULL_RECONCILE;
    editor._dirtyNodes = new Set();
    editor._dirtyBlocks = new Map();
    editor._log.push('UpdateRecover');
    commitPendingUpdates(editor);
    return;
  } finally {
    activeEditorState = previousActiveEditorState;
    isReadOnlyMode = previousReadOnlyMode;
    activeEditor = previousActiveEditor;
    isEnqueuingUpdates = previousShouldEnqueueUpdates;
  }

  const shouldUpdate =
    editor._dirtyType !== NO_DIRTY_NODES ||
    editorStateHasDirtySelection(pendingEditorState, editor);

  if (shouldUpdate) {
    if (pendingEditorState._flushSync) {
      pendingEditorState._flushSync = false;
      commitPendingUpdates(editor);
    } else if (editorStateWasCloned) {
      scheduleMicroTask(() => {
        commitPendingUpdates(editor);
      });
    }
  } else {
    if (editorStateWasCloned) {
      editor._pendingEditorState = null;
    }
  }
}
