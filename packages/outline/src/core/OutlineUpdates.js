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
import type {OutlineEditor} from './OutlineEditor';
import type {OutlineNode, NodeKey} from './OutlineNode';
import type {Selection} from './OutlineSelection';
import type {ParsedNode, NodeParserState} from './OutlineParsing';

import {updateEditorState} from './OutlineReconciler';
import {
  createSelection,
  getSelection,
  createSelectionFromParse,
} from './OutlineSelection';
import {FULL_RECONCILE, NO_DIRTY_NODES} from './OutlineConstants';
import {resetEditor} from './OutlineEditor';
import {initMutationObserver, flushMutations} from './OutlineMutations';
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
} from './OutlineUtils';
import {
  triggerListeners,
  triggerTextMutationListeners,
} from './OutlineListeners';
import {
  garbageCollectDetachedDecorators,
  garbageCollectDetachedNodes,
} from './OutlineGC';
import {internalCreateNodeFromParse} from './OutlineParsing';
import {applySelectionTransforms} from './OutlineSelection';
import invariant from 'shared/invariant';

let activeEditorState: null | EditorState = null;
let activeEditor: null | OutlineEditor = null;
let isEnqueuingUpdates: boolean = false;
let isReadOnlyMode: boolean = false;
let isAttemptingToRecoverFromReconcilerError: boolean = false;
let isPreparingPendingViewUpdate: boolean = false;

export type View = {
  clearSelection(): void,
  getRoot: () => RootNode,
  getNodeByKey: (key: NodeKey) => null | OutlineNode,
  getSelection: () => null | Selection,
  setSelection: (selection: Selection) => void,
  setCompositionKey: (compositionKey: NodeKey | null) => void,
  getCompositionKey: () => null | NodeKey,
  getNearestNodeFromDOMNode: (dom: Node) => null | OutlineNode,
  flushMutations: (mutations: Array<MutationRecord>) => void,
};

export const view: View = {
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
  flushMutations(mutations: Array<MutationRecord>): void {
    errorOnReadOnly();
    const editor = getActiveEditor();
    const observer = editor._observer;
    if (observer !== null) {
      flushMutations(editor, mutations, observer);
    }
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

function applyTextTransforms(
  editorState: EditorState,
  dirtyNodes: Set<NodeKey>,
  editor: OutlineEditor,
): void {
  const textNodeTransforms = editor._textNodeTransforms;
  if (textNodeTransforms.size > 0) {
    const nodeMap = editorState._nodeMap;
    const dirtyNodesArr = Array.from(dirtyNodes);
    const transforms = Array.from(textNodeTransforms);
    triggerTextMutationListeners(nodeMap, dirtyNodesArr, transforms);
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
  const state: NodeParserState = {
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
      state,
    );
  } finally {
    activeEditorState = previousActiveEditorState;
    isReadOnlyMode = previousReadOnlyMode;
    activeEditor = previousActiveEditor;
  }
  editorState._selection = createSelectionFromParse(
    state.remappedSelection || state.originalSelection,
  );
  return editorState;
}

// This technically isn't an update but given we need
// exposure to the module's active bindings, we have this
// function here
export function readEditorState<V>(
  editorState: EditorState,
  callbackFn: (view: View) => V,
): V {
  const previousActiveEditorState = activeEditorState;
  const previousReadOnlyMode = isReadOnlyMode;
  const previousActiveEditor = activeEditor;
  activeEditorState = editorState;
  isReadOnlyMode = true;
  activeEditor = null;
  try {
    return callbackFn(view);
  } finally {
    activeEditorState = previousActiveEditorState;
    isReadOnlyMode = previousReadOnlyMode;
    activeEditor = previousActiveEditor;
  }
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
  activeEditor = editor;
  activeEditorState = pendingEditorState;
  isReadOnlyMode = false;

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
    triggerListeners('error', editor, error, error._log);
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
    activeEditorState = previousActiveEditorState;
    isReadOnlyMode = previousReadOnlyMode;
    activeEditor = previousActiveEditor;
  }
  if (__DEV__) {
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
  const dirtyNodes = editor._dirtyNodes;
  const log = editor._log;

  editor._log = [];
  if (needsUpdate) {
    editor._dirtyType = NO_DIRTY_NODES;
    editor._dirtyNodes = new Set();
    editor._dirtySubTrees = new Set();
  }
  garbageCollectDetachedDecorators(editor, pendingEditorState);
  const pendingDecorators = editor._pendingDecorators;
  if (pendingDecorators !== null) {
    editor._decorators = pendingDecorators;
    editor._pendingDecorators = null;
    triggerListeners('decorator', editor, pendingDecorators);
  }
  const isEditorStateDirty =
    needsUpdate ||
    pendingSelection === null ||
    pendingSelection.dirty ||
    !pendingSelection.is(currentSelection);
  triggerListeners('update', editor, {
    editorState: pendingEditorState,
    dirty: isEditorStateDirty,
    dirtyNodes,
    log,
  });
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
    const queuedUpdates = editor._updates;
    if (queuedUpdates.length !== 0) {
      const [updateFn, callbackFn] = queuedUpdates.shift();
      beginUpdate(editor, updateFn, callbackFn);
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
    nextUpdateFn(view);
  }
}

export function beginUpdate(
  editor: OutlineEditor,
  updateFn: (view: View) => void,
  callbackFn?: () => void,
): void {
  const deferred = editor._deferred;
  if (callbackFn) {
    deferred.push(callbackFn);
  }
  let pendingEditorState = editor._pendingEditorState;
  let editorStateWasCloned = false;

  if (pendingEditorState === null) {
    const currentEditorState = editor._editorState;
    pendingEditorState = editor._pendingEditorState =
      cloneEditorState(currentEditorState);
    editorStateWasCloned = true;
  }

  const previousActiveEditorState = activeEditorState;
  const previousReadOnlyMode = isReadOnlyMode;
  const previousActiveEditor = activeEditor;
  const previousShouldEnqueueUpdates = isEnqueuingUpdates;
  const previouslyPendingViewUpdate = isPreparingPendingViewUpdate;
  isPreparingPendingViewUpdate = true;
  activeEditorState = pendingEditorState;
  isReadOnlyMode = false;
  isEnqueuingUpdates = true;
  activeEditor = editor;

  try {
    if (editorStateWasCloned) {
      pendingEditorState._selection = createSelection(editor);
    }
    const startingCompositionKey = editor._compositionKey;
    updateFn(view);
    processNestedUpdates(editor, deferred);
    applySelectionTransforms(pendingEditorState, editor);
    if (editor._dirtyType !== NO_DIRTY_NODES) {
      const dirtyNodes = editor._dirtyNodes;
      if (pendingEditorState.isEmpty()) {
        invariant(
          false,
          'updateEditor: the pending editor state is empty. Ensure the root not never becomes empty from an update.',
        );
      }
      applyTextTransforms(pendingEditorState, dirtyNodes, editor);
      processNestedUpdates(editor, deferred);
      garbageCollectDetachedNodes(pendingEditorState, dirtyNodes, editor);
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
    triggerListeners('error', editor, error, editor._log);
    // Restore existing editor state to the DOM
    const currentEditorState = editor._editorState;
    editor._pendingEditorState = currentEditorState;
    editor._dirtyType = FULL_RECONCILE;
    editor._dirtyNodes = new Set();
    editor._dirtySubTrees = new Set();
    editor._log.push('UpdateRecover');
    commitPendingUpdates(editor);
    return;
  } finally {
    activeEditorState = previousActiveEditorState;
    isReadOnlyMode = previousReadOnlyMode;
    activeEditor = previousActiveEditor;
    isPreparingPendingViewUpdate = previouslyPendingViewUpdate;
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
