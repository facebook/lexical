/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {View} from './OutlineView';
import type {OutlineNode, NodeKey} from './OutlineNode';
import type {Node as ReactNode} from 'react';

import {isTextNode, RootNode, TextNode, LineBreakNode} from '.';
import {
  cloneViewModel,
  enterViewModelScope,
  garbageCollectDetachedNodes,
  viewModelHasDirtySelectionOrNeedsSync,
  ViewModel,
  commitPendingUpdates,
  applyTextTransforms,
  triggerErrorListeners,
  parseViewModel,
  errorOnProcessingTextNodeTransforms,
  applySelectionTransforms,
  triggerUpdateListeners,
  triggerEndMutationListeners,
} from './OutlineView';
import {createSelection} from './OutlineSelection';
import {
  generateRandomKey,
  emptyFunction,
  scheduleMicroTask,
} from './OutlineUtils';
import {createRootNode as createRoot} from './OutlineRootNode';
import invariant from 'shared/invariant';

export type EditorThemeClassName = string;

export type EditorThemeClasses = {
  root?: EditorThemeClassName,
  text?: {
    bold?: EditorThemeClassName,
    underline?: EditorThemeClassName,
    strikethrough?: EditorThemeClassName,
    underlineStrikethrough?: EditorThemeClassName,
    italic?: EditorThemeClassName,
    code?: EditorThemeClassName,
    hashtag?: EditorThemeClassName,
    overflowed?: EditorThemeClassName,
  },
  paragraph?: EditorThemeClassName,
  image?: EditorThemeClassName,
  list?: {
    ul?: EditorThemeClassName,
    ol?: EditorThemeClassName,
  },
  link?: EditorThemeClassName,
  listitem?: EditorThemeClassName,
  quote?: EditorThemeClassName,
  code?: EditorThemeClassName,
  heading?: {
    h1?: EditorThemeClassName,
    h2?: EditorThemeClassName,
    h3?: EditorThemeClassName,
    h4?: EditorThemeClassName,
    h5?: EditorThemeClassName,
  },
  // Handle other generic values
  [string]: EditorThemeClassName | {[string]: EditorThemeClassName},
};

export type ErrorListener = (error: Error) => void;

export type UpdateListener = (viewModel: ViewModel) => void;

export type DecoratorListener = (decorator: {[NodeKey]: ReactNode}) => void;

export type TextNodeTransform = (node: TextNode, view: View) => void;

export type EditorElementListener = (element: null | HTMLElement) => void;

export type MutationListener = () => (editorElement: HTMLElement) => void;

export function resetEditor(editor: OutlineEditor): void {
  const root = createRoot();
  const emptyViewModel = new ViewModel({root});
  const prevViewModel = editor._viewModel;
  const rootChildrenKeys = prevViewModel._nodeMap.root.__children;
  const keyToDOMMap = editor._keyToDOMMap;
  const editorElement = editor._editorElement;

  if (editorElement !== null) {
    // Remove all existing top level DOM elements from editor
    for (let i = 0; i < rootChildrenKeys.length; i++) {
      const rootChildKey = rootChildrenKeys[i];
      const element = keyToDOMMap.get(rootChildKey);
      if (element !== undefined && element.parentNode === editorElement) {
        editorElement.removeChild(element);
      }
    }
  }
  editor._viewModel = emptyViewModel;
  editor._pendingViewModel = null;
  editor._compositionKey = null;
  keyToDOMMap.clear();
  editor._textContent = '';
  triggerUpdateListeners(editor);
  triggerEndMutationListeners(editor);
}

export function createEditor(
  editorThemeClasses?: EditorThemeClasses,
): OutlineEditor {
  const root = createRoot();
  const viewModel = new ViewModel({root});
  return new OutlineEditor(viewModel, editorThemeClasses || {});
}

function updateEditor(
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
  const currentPendingViewModel = pendingViewModel;

  try {
    enterViewModelScope(
      (view: View) => {
        if (viewModelWasCloned) {
          currentPendingViewModel._selection = createSelection(
            currentPendingViewModel,
            editor,
          );
        }
        updateFn(view);
        if (markAllTextNodesAsDirty) {
          const currentViewModel = editor._viewModel;
          const nodeMap = currentViewModel._nodeMap;
          const pendingNodeMap = currentPendingViewModel._nodeMap;
          for (const nodeKey in nodeMap) {
            const node = nodeMap[nodeKey];
            if (isTextNode(node) && pendingNodeMap[nodeKey] !== undefined) {
              node.getWritable();
            }
          }
        }
        applySelectionTransforms(currentPendingViewModel, editor);
        if (currentPendingViewModel.hasDirtyNodes()) {
          applyTextTransforms(currentPendingViewModel, editor);
          garbageCollectDetachedNodes(currentPendingViewModel, editor);
        }
        const pendingSelection = currentPendingViewModel._selection;
        if (pendingSelection !== null) {
          const pendingNodeMap = currentPendingViewModel._nodeMap;
          const anchorKey = pendingSelection.anchorKey;
          const focusKey = pendingSelection.focusKey;
          if (
            pendingNodeMap[anchorKey] === undefined ||
            pendingNodeMap[focusKey] === undefined
          ) {
            invariant(
              false,
              'updateEditor: selection has been lost because the previously selected nodes have been removed and ' +
                "selection wasn't moved to another node. Ensure selection changes after removing/replacing a selected node.",
            );
          }
        }
      },
      pendingViewModel,
      editor,
      false,
    );
  } catch (error) {
    // Report errors
    triggerErrorListeners(editor, error);
    // Restore existing view model to the DOM
    const currentViewModel = editor._viewModel;
    currentViewModel.markDirty();
    editor._pendingViewModel = currentViewModel;
    commitPendingUpdates(editor);
    return false;
  }
  const shouldUpdate =
    pendingViewModel.hasDirtyNodes() ||
    viewModelHasDirtySelectionOrNeedsSync(pendingViewModel, editor);

  if (!shouldUpdate) {
    if (viewModelWasCloned) {
      editor._pendingViewModel = null;
    }
    return false;
  }
  if (viewModelWasCloned) {
    scheduleMicroTask(() => {
      commitPendingUpdates(editor);
    });
  }
  return true;
}

export class OutlineEditor {
  _editorElement: null | HTMLElement;
  _viewModel: ViewModel;
  _pendingViewModel: null | ViewModel;
  _compositionKey: null | NodeKey;
  _deferred: Array<() => void>;
  _key: string;
  _keyToDOMMap: Map<NodeKey, HTMLElement>;
  _errorListeners: Set<ErrorListener>;
  _updateListeners: Set<UpdateListener>;
  _elementListeners: Set<EditorElementListener>;
  _mutationListeners: Set<MutationListener>;
  _decoratorListeners: Set<DecoratorListener>;
  _textNodeTransforms: Set<TextNodeTransform>;
  _nodeTypes: Map<string, Class<OutlineNode>>;
  _decorators: {[NodeKey]: ReactNode};
  _pendingDecorators: null | {[NodeKey]: ReactNode};
  _textContent: string;
  _editorThemeClasses: EditorThemeClasses;

  constructor(viewModel: ViewModel, editorThemeClasses: EditorThemeClasses) {
    // The editor element associated with this editor
    this._editorElement = null;
    // The current view model
    this._viewModel = viewModel;
    // Handling of drafts and updates
    this._pendingViewModel = null;
    // Used to help co-ordinate selection and events
    this._compositionKey = null;
    this._deferred = [];
    // Used during reconciliation
    this._keyToDOMMap = new Map();
    // error listeners
    this._errorListeners = new Set();
    // onChange listeners
    this._updateListeners = new Set();
    // Used for rendering React Portals into nodes
    this._decoratorListeners = new Set();
    // Editor element listeners
    this._elementListeners = new Set();
    // Mutation listeners
    this._mutationListeners = new Set();
    // Class name mappings for nodes/placeholders
    this._editorThemeClasses = editorThemeClasses;
    // Handling of text node transforms
    this._textNodeTransforms = new Set();
    // Mapping of types to their nodes
    this._nodeTypes = new Map([
      ['text', TextNode],
      ['linebreak', LineBreakNode],
      ['root', RootNode],
    ]);
    this._key = generateRandomKey();
    // React node decorators for portals
    this._decorators = {};
    this._pendingDecorators = null;
    // Editor fast-path for text content
    this._textContent = '';
  }
  isComposing(): boolean {
    return this._compositionKey != null;
  }
  setCompositionKey(nodeKey: null | NodeKey): void {
    if (nodeKey === null) {
      this._compositionKey = null;
      updateEditor(this, emptyFunction, false);
      const pendingViewModel = this._pendingViewModel;
      if (pendingViewModel !== null) {
        pendingViewModel.markDirty();
      }
    } else {
      updateEditor(this, emptyFunction, false);
    }
    this._deferred.push(() => {
      this._compositionKey = nodeKey;
    });
  }
  registerNodeType(nodeType: string, klass: Class<OutlineNode>): void {
    this._nodeTypes.set(nodeType, klass);
  }
  addUpdateListener(listener: UpdateListener): () => void {
    this._updateListeners.add(listener);
    return () => {
      this._updateListeners.delete(listener);
    };
  }
  addErrorListener(listener: ErrorListener): () => void {
    this._errorListeners.add(listener);
    return () => {
      this._errorListeners.delete(listener);
    };
  }
  addMutationListener(listener: MutationListener): () => void {
    this._mutationListeners.add(listener);
    return () => {
      this._mutationListeners.delete(listener);
    };
  }
  addEditorElementListener(listener: EditorElementListener): () => void {
    this._elementListeners.add(listener);
    listener(this._editorElement);

    return () => {
      this._elementListeners.delete(listener);
      listener(null);
    };
  }
  addDecoratorListener(listener: DecoratorListener): () => void {
    this._decoratorListeners.add(listener);
    return () => {
      this._decoratorListeners.delete(listener);
    };
  }
  addTextNodeTransform(listener: TextNodeTransform): () => void {
    this._textNodeTransforms.add(listener);
    updateEditor(this, emptyFunction, true);
    return () => {
      this._textNodeTransforms.delete(listener);
    };
  }
  getDecorators(): {[NodeKey]: ReactNode} {
    return this._decorators;
  }
  getEditorKey(): string {
    return this._key;
  }
  getEditorElement(): null | HTMLElement {
    return this._editorElement;
  }
  getTextContent(): string {
    return this._textContent;
  }
  setEditorElement(nextEditorElement: null | HTMLElement): void {
    const prevEditorElement = this._editorElement;
    if (nextEditorElement !== prevEditorElement) {
      if (nextEditorElement === null || prevEditorElement !== null) {
        resetEditor(this);
      }
      this._editorElement = nextEditorElement;
      if (nextEditorElement !== null) {
        nextEditorElement.setAttribute('data-outline-editor', 'true');
        this._keyToDOMMap.set('root', nextEditorElement);
        commitPendingUpdates(this);
      }
      const editorElementListeners = Array.from(this._elementListeners);
      for (let i = 0; i < editorElementListeners.length; i++) {
        editorElementListeners[i](nextEditorElement);
      }
    }
  }
  getElementByKey(key: NodeKey): HTMLElement | null {
    return this._keyToDOMMap.get(key) || null;
  }
  getViewModel(): ViewModel {
    return this._viewModel;
  }
  setViewModel(viewModel: ViewModel): void {
    if (this._pendingViewModel !== null) {
      commitPendingUpdates(this);
    }
    this._pendingViewModel = viewModel;
    commitPendingUpdates(this);
  }
  parseViewModel(stringifiedViewModel: string): ViewModel {
    return parseViewModel(stringifiedViewModel, this);
  }
  update(updateFn: (view: View) => void, callbackFn?: () => void): boolean {
    errorOnProcessingTextNodeTransforms();
    return updateEditor(this, updateFn, false, callbackFn);
  }
  focus(callbackFn?: () => void): void {
    const editorElement = this._editorElement;
    if (editorElement !== null) {
      // This ensures that iOS does not trigger caps lock upon focus
      editorElement.setAttribute('autocapitalize', 'off');
      this.update(
        (view: View) => {
          const selection = view.getSelection();
          if (selection !== null) {
            // Marking the selection dirty will force the selection back to it
            selection.isDirty = true;
          } else {
            const lastTextNode = view.getRoot().getLastTextNode();
            if (lastTextNode !== null) {
              lastTextNode.select();
            }
          }
        },
        () => {
          editorElement.removeAttribute('autocapitalize');
          if (callbackFn) {
            callbackFn();
          }
        },
      );
    }
  }
  canShowPlaceholder(): boolean {
    if (this.isComposing() || this._textContent !== '') {
      return false;
    }
    const nodeMap = this._viewModel._nodeMap;
    const topBlockIDs = nodeMap.root.__children;
    const topBlockIDsLength = topBlockIDs.length;
    if (topBlockIDsLength > 1) {
      return false;
    }
    for (let i = 0; i < topBlockIDsLength; i++) {
      const topBlock = nodeMap[topBlockIDs[i]];

      if (topBlock && topBlock.__type !== 'paragraph') {
        return false;
      }
    }
    return true;
  }
}
