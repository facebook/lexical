/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {ParsedEditorState} from './LexicalEditorState';
import type {
  LexicalEditor,
  Transform,
  EditorUpdateOptions,
  CommandPayload,
} from './LexicalEditor';
import type {LexicalNode} from './LexicalNode';
import type {ParsedNode, NodeParserState} from './LexicalParsing';

import {updateEditorState} from './LexicalReconciler';
import {
  internalCreateSelection,
  internalCreateSelectionFromParse,
} from './LexicalSelection';
import {FULL_RECONCILE, NO_DIRTY_NODES} from './LexicalConstants';
import {resetEditor} from './LexicalEditor';
import {initMutationObserver} from './LexicalMutations';
import {
  EditorState,
  editorStateHasDirtySelection,
  cloneEditorState,
} from './LexicalEditorState';
import {
  scheduleMicroTask,
  $getCompositionKey,
  getEditorStateTextContent,
  getRegisteredNodeOrThrow,
  getEditorsToPropagate,
} from './LexicalUtils';
import {
  $garbageCollectDetachedDecorators,
  $garbageCollectDetachedNodes,
} from './LexicalGC';
import {internalCreateNodeFromParse} from './LexicalParsing';
import {applySelectionTransforms} from './LexicalSelection';
import {$isTextNode} from '.';
import {$normalizeTextNode} from './LexicalNormalization';
import invariant from 'shared/invariant';

let activeEditorState: null | EditorState = null;
let activeEditor: null | LexicalEditor = null;
let isReadOnlyMode: boolean = false;
let isAttemptingToRecoverFromReconcilerError: boolean = false;
let infiniteTransformCount: number = 0;

export function isCurrentlyReadOnlyMode(): boolean {
  return isReadOnlyMode;
}

export function errorOnReadOnly(): void {
  if (isReadOnlyMode) {
    invariant(false, 'Cannot use method in read-only mode.');
  }
}

export function errorOnInfiniteTransforms(): void {
  if (infiniteTransformCount > 99) {
    invariant(
      false,
      'One or more transforms are endlessly triggering additional transforms. May have encountered infinite recursion caused by transforms that have their preconditions too lose and/or conflict with each other.',
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

export function getActiveEditor(): LexicalEditor {
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

export function $applyTransforms(
  editor: LexicalEditor,
  node: LexicalNode,
  transformsCache: Map<string, Array<Transform<LexicalNode>>>,
) {
  const type = node.__type;
  const registeredNode = getRegisteredNodeOrThrow(editor, type);
  let transformsArr = transformsCache.get(type);
  if (transformsArr === undefined) {
    transformsArr = Array.from(registeredNode.transforms);
    transformsCache.set(type, transformsArr);
  }
  const transformsArrLength = transformsArr.length;
  for (let i = 0; i < transformsArrLength; i++) {
    transformsArr[i](node);
    if (!node.isAttached()) {
      break;
    }
  }
}

function $isNodeValidForTransform(
  node: void | LexicalNode,
  compositionKey: null | string,
): boolean {
  return (
    node !== undefined &&
    // We don't want to transform nodes being composed
    node.__key !== compositionKey &&
    node.isAttached()
  );
}

function $normalizeAllDirtyTextNodes(
  editorState: EditorState,
  editor: LexicalEditor,
): void {
  const dirtyLeaves = editor._dirtyLeaves;
  const nodeMap = editorState._nodeMap;
  const dirtyLeavesLength = dirtyLeaves.size;
  const dDirtyLeavesArr = Array.from(dirtyLeaves);
  for (let i = 0; i < dirtyLeavesLength; i++) {
    const nodeKey = dDirtyLeavesArr[i];
    const node = nodeMap.get(nodeKey);
    if ($isTextNode(node) && node.isSimpleText() && !node.isUnmergeable()) {
      $normalizeTextNode(node);
    }
  }
}

/**
 * Transform heuristic:
 * 1. We transform leaves first. If transforms generate additional dirty nodes we repeat step 1.
 * The reasoning behind this is that marking a leaf as dirty marks all its parent elements as dirty too.
 * 2. We transform elements. If element transforms generate additional dirty nodes we repeat step 1.
 * If element transforms only generate additional dirty elements we only repeat step 2.
 *
 * Note that to keep track of newly dirty nodes and subtress we leverage the editor._dirtyNodes and
 * editor._subtrees which we reset in every loop.
 */
function $applyAllTransforms(
  editorState: EditorState,
  editor: LexicalEditor,
): void {
  const dirtyLeaves = editor._dirtyLeaves;
  const dirtyElements = editor._dirtyElements;
  const nodeMap = editorState._nodeMap;
  const compositionKey = $getCompositionKey();
  const transformsCache = new Map();

  let untransformedDirtyLeaves = dirtyLeaves;
  let untransformedDirtyLeavesLength = untransformedDirtyLeaves.size;
  let untransformedDirtyElements = dirtyElements;
  let untransformedDirtyElementsLength = untransformedDirtyElements.size;
  while (
    untransformedDirtyLeavesLength > 0 ||
    untransformedDirtyElementsLength > 0
  ) {
    if (untransformedDirtyLeavesLength > 0) {
      // We leverage editor._dirtyLeaves to track the new dirty leaves after the transforms
      editor._dirtyLeaves = new Set();
      const untransformedDirtyLeavesArr = Array.from(untransformedDirtyLeaves);
      for (let i = 0; i < untransformedDirtyLeavesLength; i++) {
        const nodeKey = untransformedDirtyLeavesArr[i];
        const node = nodeMap.get(nodeKey);
        if ($isTextNode(node) && node.isSimpleText() && !node.isUnmergeable()) {
          $normalizeTextNode(node);
        }
        if (
          node !== undefined &&
          $isNodeValidForTransform(node, compositionKey)
        ) {
          $applyTransforms(editor, node, transformsCache);
        }
        dirtyLeaves.add(nodeKey);
      }
      untransformedDirtyLeaves = editor._dirtyLeaves;
      untransformedDirtyLeavesLength = untransformedDirtyLeaves.size;
      // We want to prioritize node transforms over element transforms
      if (untransformedDirtyLeavesLength > 0) {
        infiniteTransformCount++;
        continue;
      }
    }
    // All dirty leaves have been processed. Let's do elements!
    // We have previously processed dirty leaves, so let's restart the editor leaves Set to track
    // new ones caused by element transforms
    editor._dirtyLeaves = new Set();
    editor._dirtyElements = new Map();
    const untransformedDirtyElementsArr = Array.from(
      untransformedDirtyElements,
    );
    for (let i = 0; i < untransformedDirtyElementsLength; i++) {
      const currentUntransformedDirtyElement = untransformedDirtyElementsArr[i];
      const nodeKey = currentUntransformedDirtyElement[0];
      const intentionallyMarkedAsDirty = currentUntransformedDirtyElement[1];
      if (nodeKey === 'root' || !intentionallyMarkedAsDirty) {
        continue;
      }
      const nodeIntentionallyMarkedAsDirty =
        untransformedDirtyElementsArr[i][1];
      const node = nodeMap.get(nodeKey);
      if (
        node !== undefined &&
        $isNodeValidForTransform(node, compositionKey)
      ) {
        $applyTransforms(editor, node, transformsCache);
      }
      dirtyElements.set(nodeKey, nodeIntentionallyMarkedAsDirty);
    }
    untransformedDirtyLeaves = editor._dirtyLeaves;
    untransformedDirtyLeavesLength = untransformedDirtyLeaves.size;
    untransformedDirtyElements = editor._dirtyElements;
    untransformedDirtyElementsLength = untransformedDirtyElements.size;
    infiniteTransformCount++;
  }

  editor._dirtyLeaves = dirtyLeaves;
  editor._dirtyElements = dirtyElements;
}

export function parseEditorState(
  stringifiedEditorState: string,
  editor: LexicalEditor,
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
  editorState._selection = internalCreateSelectionFromParse(
    nodeParserState.remappedSelection || nodeParserState.originalSelection,
  );
  return editorState;
}

// This technically isn't an update but given we need
// exposure to the module's active bindings, we have this
// function here
export function readEditorState<V>(
  editorState: EditorState,
  callbackFn: () => V,
): V {
  const previousActiveEditorState = activeEditorState;
  const previousReadOnlyMode = isReadOnlyMode;
  const previousActiveEditor = activeEditor;
  activeEditorState = editorState;
  isReadOnlyMode = true;
  activeEditor = null;
  try {
    return callbackFn();
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
    throw new Error('Cannot call set() on a frozen Lexical node map');
  };
  // $FlowFixMe: this is allowed
  nodeMap.clear = () => {
    throw new Error('Cannot call clear() on a frozen Lexical node map');
  };
  // $FlowFixMe: this is allowed
  nodeMap.delete = () => {
    throw new Error('Cannot call delete() on a frozen Lexical node map');
  };
}

export function commitPendingUpdates(editor: LexicalEditor): void {
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
  const previouslyUpdating = editor._updating;
  activeEditor = editor;
  activeEditorState = pendingEditorState;
  isReadOnlyMode = false;
  // We don't want updates to sync block the reconcilation.
  editor._updating = true;

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
    editor._updating = previouslyUpdating;
    activeEditorState = previousActiveEditorState;
    isReadOnlyMode = previousReadOnlyMode;
    activeEditor = previousActiveEditor;
  }
  pendingEditorState._readOnly = true;
  if (__DEV__) {
    handleDEVOnlyPendingUpdateGuarantees(pendingEditorState);
  }
  const dirtyLeaves = editor._dirtyLeaves;
  const dirtyElements = editor._dirtyElements;
  const normalizedNodes = editor._normalizedNodes;
  const tags = editor._updateTags;
  const log = editor._log;

  editor._log = [];
  if (needsUpdate) {
    editor._dirtyType = NO_DIRTY_NODES;
    editor._cloneNotNeeded.clear();
    editor._dirtyLeaves = new Set();
    editor._dirtyElements = new Map();
    editor._normalizedNodes = new Set();
    editor._updateTags = new Set();
  }
  $garbageCollectDetachedDecorators(editor, pendingEditorState);
  const pendingDecorators = editor._pendingDecorators;
  if (pendingDecorators !== null) {
    editor._decorators = pendingDecorators;
    editor._pendingDecorators = null;
    triggerListeners('decorator', editor, true, pendingDecorators);
  }
  triggerTextContentListeners(editor, currentEditorState, pendingEditorState);
  triggerListeners('update', editor, true, {
    tags,
    normalizedNodes,
    prevEditorState: currentEditorState,
    editorState: pendingEditorState,
    dirtyLeaves,
    dirtyElements,
    log,
  });
  triggerDeferredUpdateCallbacks(editor);
  triggerEnqueuedUpdates(editor);
}

function triggerTextContentListeners(
  editor: LexicalEditor,
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
  type: 'update' | 'error' | 'root' | 'decorator' | 'textcontent',

  editor: LexicalEditor,
  isCurrentlyEnqueuingUpdates: boolean,
  // $FlowFixMe: needs refining
  ...payload: Array<any>
): void {
  const previouslyUpdating = editor._updating;
  editor._updating = isCurrentlyEnqueuingUpdates;
  try {
    const listeners = Array.from(editor._listeners[type]);
    for (let i = 0; i < listeners.length; i++) {
      listeners[i](...payload);
    }
  } finally {
    editor._updating = previouslyUpdating;
  }
}

export function triggerCommandListeners(
  editor: LexicalEditor,
  type: string,
  payload: CommandPayload,
): boolean {
  if (editor._updating === false || activeEditor !== editor) {
    let returnVal = false;
    editor.update(() => {
      returnVal = triggerCommandListeners(editor, type, payload);
    });
    return returnVal;
  }
  const editors = getEditorsToPropagate(editor);
  for (let i = 4; i >= 0; i--) {
    for (let e = 0; e < editors.length; e++) {
      const currentEditor = editors[e];
      const commandListeners = currentEditor._listeners.command;
      const listeners = Array.from(commandListeners[i]);
      for (let s = 0; s < listeners.length; s++) {
        if (listeners[s](type, payload, editor) === true) {
          return true;
        }
      }
    }
  }
  return false;
}

function triggerEnqueuedUpdates(editor: LexicalEditor): void {
  const queuedUpdates = editor._updates;
  if (queuedUpdates.length !== 0) {
    const [updateFn, options] = queuedUpdates.shift();
    beginUpdate(editor, updateFn, false, options);
  }
}

function triggerDeferredUpdateCallbacks(editor: LexicalEditor): void {
  const deferred = editor._deferred;
  editor._deferred = [];
  if (deferred.length !== 0) {
    const previouslyUpdating = editor._updating;
    editor._updating = true;
    try {
      for (let i = 0; i < deferred.length; i++) {
        deferred[i]();
      }
    } finally {
      editor._updating = previouslyUpdating;
    }
  }
}

function processNestedUpdates(editor: LexicalEditor): boolean {
  const queuedUpdates = editor._updates;
  let skipTransforms = false;
  // Updates might grow as we process them, we so we'll need
  // to handle each update as we go until the updates array is
  // empty.
  while (queuedUpdates.length !== 0) {
    const [nextUpdateFn, options] = queuedUpdates.shift();
    let onUpdate;
    let tag;
    if (options !== undefined) {
      onUpdate = options.onUpdate;
      tag = options.tag;
      if (options.skipTransforms) {
        skipTransforms = true;
      }
      if (onUpdate) {
        editor._deferred.push(onUpdate);
      }
      if (tag) {
        editor._updateTags.add(tag);
      }
    }
    nextUpdateFn();
  }
  return skipTransforms;
}

function beginUpdate(
  editor: LexicalEditor,
  updateFn: () => void,
  skipEmptyCheck: boolean,
  options?: EditorUpdateOptions,
): void {
  const updateTags = editor._updateTags;
  let onUpdate;
  let tag;
  let skipTransforms = false;

  if (options !== undefined) {
    onUpdate = options.onUpdate;
    tag = options.tag;
    if (tag != null) {
      updateTags.add(tag);
    }
    skipTransforms = options.skipTransforms;
  }
  if (onUpdate) {
    editor._deferred.push(onUpdate);
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
  const previouslyUpdating = editor._updating;
  activeEditorState = pendingEditorState;
  isReadOnlyMode = false;
  editor._updating = true;
  activeEditor = editor;

  try {
    if (editorStateWasCloned) {
      pendingEditorState._selection = internalCreateSelection(editor);
    }
    const startingCompositionKey = editor._compositionKey;
    updateFn();
    skipTransforms = processNestedUpdates(editor);
    applySelectionTransforms(pendingEditorState, editor);
    if (editor._dirtyType !== NO_DIRTY_NODES) {
      if (!skipEmptyCheck && pendingEditorState.isEmpty()) {
        invariant(
          false,
          'updateEditor: the pending editor state is empty. Ensure the root not never becomes empty from an update.',
        );
      }
      if (skipTransforms) {
        $normalizeAllDirtyTextNodes(pendingEditorState, editor);
      } else {
        $applyAllTransforms(pendingEditorState, editor);
      }
      processNestedUpdates(editor);
      $garbageCollectDetachedNodes(
        currentEditorState,
        pendingEditorState,
        editor._dirtyLeaves,
        editor._dirtyElements,
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
    editor._cloneNotNeeded.clear();
    editor._dirtyLeaves = new Set();
    editor._dirtyElements.clear();
    editor._log.push('UpdateRecover');
    commitPendingUpdates(editor);
    return;
  } finally {
    activeEditorState = previousActiveEditorState;
    isReadOnlyMode = previousReadOnlyMode;
    activeEditor = previousActiveEditor;
    editor._updating = previouslyUpdating;
    infiniteTransformCount = 0;
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
    updateTags.clear();
    editor._deferred = [];
    pendingEditorState._flushSync = false;
    if (editorStateWasCloned) {
      editor._pendingEditorState = null;
    }
  }
}

export function updateEditor(
  editor: LexicalEditor,
  updateFn: () => void,
  skipEmptyCheck: boolean,
  options?: EditorUpdateOptions,
): void {
  if (editor._updating) {
    editor._updates.push([updateFn, options]);
  } else {
    beginUpdate(editor, updateFn, skipEmptyCheck, options);
  }
}
