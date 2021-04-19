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
  triggerTextMutationListeners,
  triggerUpdateListeners,
  triggerErrorListeners,
  parseViewModel,
} from './OutlineView';
import {createSelection} from './OutlineSelection';
import {
  generateRandomKey,
  emptyFunction,
  invariant,
  scheduleMicroTask,
} from './OutlineUtils';
import {getWritableNode} from './OutlineNode';
import {createRootNode as createRoot} from './OutlineRootNode';
import {reconcilePlaceholder} from './OutlineReconciler';

export type EditorThemeClassName = string;

export type EditorThemeClasses = {
  placeholder?: EditorThemeClassName,
  root?: EditorThemeClassName,
  text?: {
    bold?: EditorThemeClassName,
    underline?: EditorThemeClassName,
    strikethrough?: EditorThemeClassName,
    underlineStrikethrough?: EditorThemeClassName,
    italic?: EditorThemeClassName,
    code?: EditorThemeClassName,
    link?: EditorThemeClassName,
    hashtag?: EditorThemeClassName,
    overflowed?: EditorThemeClassName,
  },
  paragraph?: EditorThemeClassName,
  image?: EditorThemeClassName,
  list?: {
    ul?: EditorThemeClassName,
    ol?: EditorThemeClassName,
  },
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

function resetEditor(editor: OutlineEditor): void {
  const root = createRoot();
  const viewModel = new ViewModel({root});
  editor._viewModel = viewModel;
  editor._pendingViewModel = null;
  editor._placeholderElement = null;
  editor._keyToDOMMap.clear();
  editor._textContent = '';
  triggerUpdateListeners(editor);
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
  let pendingViewModel = editor._pendingViewModel;
  let viewModelWasCloned = false;

  if (pendingViewModel === null) {
    const currentViewModel = editor._viewModel;
    pendingViewModel = editor._pendingViewModel = cloneViewModel(
      currentViewModel,
    );
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
              getWritableNode(node);
            }
          }
        }
        if (currentPendingViewModel.hasDirtyNodes()) {
          triggerTextMutationListeners(currentPendingViewModel, editor);
          garbageCollectDetachedNodes(currentPendingViewModel, editor);
        }
      },
      pendingViewModel,
      editor,
      false,
    );
  } catch (error) {
    triggerErrorListeners(editor, error);
    editor._pendingViewModel = null;
    return false;
  }
  const shouldUpdate =
    pendingViewModel.hasDirtyNodes() ||
    viewModelHasDirtySelectionOrNeedsSync(pendingViewModel, editor);

  if (!shouldUpdate) {
    editor._pendingViewModel = null;
    return false;
  }
  if (viewModelWasCloned) {
    scheduleMicroTask(() => {
      commitPendingUpdates(editor);
      if (callbackFn) {
        callbackFn();
      }
    });
  }
  return true;
}

export class OutlineEditor {
  _editorElement: null | HTMLElement;
  _viewModel: ViewModel;
  _pendingViewModel: null | ViewModel;
  _isComposing: boolean;
  _isKeyDown: boolean;
  _isPointerDown: boolean;
  _key: string;
  _keyToDOMMap: Map<NodeKey, HTMLElement>;
  _errorListeners: Set<ErrorListener>;
  _updateListeners: Set<UpdateListener>;
  _elementListeners: Set<EditorElementListener>;
  _decoratorListeners: Set<DecoratorListener>;
  _textNodeTransforms: Set<TextNodeTransform>;
  _nodeTypes: Map<string, Class<OutlineNode>>;
  _nodeDecorators: {[NodeKey]: ReactNode};
  _pendingNodeDecorators: null | {[NodeKey]: ReactNode};
  _placeholderText: string;
  _placeholderElement: null | HTMLElement;
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
    this._isComposing = false;
    this._isKeyDown = false;
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
    this._nodeDecorators = {};
    // Outline tries to garbage collect nodes
    // so if it garbage collects a node with
    // a decorator, it should set the next
    // decorators to pending until the update
    // is complete.
    this._pendingNodeDecorators = null;
    // Used for rendering placeholder text
    this._placeholderText = '';
    this._placeholderElement = null;
    // Editor fast-path for text content
    this._textContent = '';
  }
  isComposing(): boolean {
    return this._isComposing;
  }
  isKeyDown(): boolean {
    return this._isKeyDown;
  }
  isPointerDown(): boolean {
    return this._isPointerDown;
  }
  setComposing(isComposing: boolean): void {
    this._isComposing = isComposing;
    if (isComposing) {
      reconcilePlaceholder(this, this._viewModel);
    }
  }
  setKeyDown(isKeyDown: boolean): void {
    this._isKeyDown = isKeyDown;
  }
  setPointerDown(isPointerDown: boolean): void {
    this._isPointerDown = isPointerDown;
  }
  addNodeDecorator(key: NodeKey, decorator: ReactNode): void {
    const pendingNodeDecorators = this._pendingNodeDecorators || {
      ...this._nodeDecorators,
    };
    pendingNodeDecorators[key] = decorator;
    this._pendingNodeDecorators = pendingNodeDecorators;
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
  addEditorElementListener(listener: EditorElementListener): () => void {
    this._elementListeners.add(listener);
    return () => {
      this._elementListeners.delete(listener);
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
  getNodeDecorators(): {[NodeKey]: ReactNode} {
    return this._nodeDecorators;
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
    this._editorElement = nextEditorElement;
    if (nextEditorElement === null) {
      if (prevEditorElement !== null) {
        prevEditorElement.textContent = '';
      }
      resetEditor(this);
    } else {
      if (
        nextEditorElement !== prevEditorElement &&
        prevEditorElement !== null
      ) {
        resetEditor(this);
      }
      nextEditorElement.setAttribute('data-outline-editor', 'true');
      this._keyToDOMMap.set('root', nextEditorElement);
      commitPendingUpdates(this);
    }
    const editorElementListeners = Array.from(this._elementListeners);
    for (let i = 0; i < editorElementListeners.length; i++) {
      editorElementListeners[i](nextEditorElement);
    }
  }
  getElementByKey(key: NodeKey): HTMLElement {
    const element = this._keyToDOMMap.get(key);
    if (element === undefined) {
      if (__DEV__) {
        invariant(false, 'getElementByKey failed for key ' + key);
      } else {
        invariant();
      }
    }
    return element;
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
    return updateEditor(this, updateFn, false, callbackFn);
  }
  setPlaceholder(placeholderText: string): void {
    const placeholderElement = this._placeholderElement;
    if (placeholderElement !== null) {
      // $FlowFixMe: placeholder elements always have a text node
      placeholderElement.firstChild.nodeValue = placeholderText;
    }
    this._placeholderText = placeholderText;
    reconcilePlaceholder(this, this._viewModel);
  }
}
