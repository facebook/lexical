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

import {RootNode, TextNode} from '.';
import {
  cloneViewModel,
  enterViewModelScope,
  garbageCollectDetachedNodes,
  viewModelHasDirtySelectionOrNeedsSync,
  ViewModel,
  commitPendingUpdates,
  triggerTextMutationListeners,
  triggerUpdateListeners,
  parseViewModel,
} from './OutlineView';
import {createSelection} from './OutlineSelection';
import {generateRandomKey, emptyFunction} from './OutlineUtils';
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

export type UpdateListener = (viewModel: ViewModel) => void;

export type DecoratorListener = (decorator: {[NodeKey]: ReactNode}) => void;

export type TextNodeTransform = (node: TextNode, view: View) => void;

const NativePromise = window.Promise;

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
          if (
            node instanceof TextNode &&
            pendingNodeMap[nodeKey] !== undefined
          ) {
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
  const shouldUpdate =
    pendingViewModel.hasDirtyNodes() ||
    viewModelHasDirtySelectionOrNeedsSync(pendingViewModel, editor);

  if (!shouldUpdate) {
    editor._pendingViewModel = null;
    return false;
  }
  if (viewModelWasCloned) {
    NativePromise.resolve().then(() => {
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
  _updateListeners: Set<UpdateListener>;
  _decoratorListeners: Set<DecoratorListener>;
  _textNodeTransforms: Set<TextNodeTransform>;
  _registeredNodeTypes: Map<string, Class<OutlineNode>>;
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
    // Used during reconcilation
    this._keyToDOMMap = new Map();
    // onChange listeners
    this._updateListeners = new Set();
    // Used for rendering React Portals into nodes
    this._decoratorListeners = new Set();
    // Class name mappings for nodes/placeholders
    this._editorThemeClasses = editorThemeClasses;
    // Handling of text node transforms
    this._textNodeTransforms = new Set();
    // Mapping of types to their nodes
    this._registeredNodeTypes = new Map([
      ['text', TextNode],
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
    const nodeDecorators = {...this._nodeDecorators};
    nodeDecorators[key] = decorator;
    this._nodeDecorators = nodeDecorators;
    if (this._pendingViewModel === null) {
      triggerUpdateListeners(this);
    }
  }
  addNodeType(nodeType: string, klass: Class<OutlineNode>): () => void {
    this._registeredNodeTypes.set(nodeType, klass);
    return () => {
      this._registeredNodeTypes.delete(nodeType);
    };
  }
  addUpdateListener(listener: UpdateListener): () => void {
    this._updateListeners.add(listener);
    return () => {
      this._updateListeners.delete(listener);
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
      this._keyToDOMMap.delete('root');
    } else {
      if (nextEditorElement !== prevEditorElement) {
        resetEditor(this);
      }
      nextEditorElement.setAttribute('data-outline-editor', 'true');
      this._keyToDOMMap.set('root', nextEditorElement);
      commitPendingUpdates(this);
    }
  }
  getElementByKey(key: NodeKey): HTMLElement {
    const element = this._keyToDOMMap.get(key);
    if (element === undefined) {
      throw new Error('getElementByKey failed for key ' + key);
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
