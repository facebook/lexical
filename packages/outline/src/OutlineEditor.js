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
  applyTextTransforms,
  cloneViewModel,
  enterViewModelScope,
  garbageCollectDetachedNodes,
  viewModelHasDirtySelectionOrNeedsSync,
  ViewModel,
  commitPendingUpdates,
  triggerUpdateListeners,
} from './OutlineView';
import {createSelection} from './OutlineSelection';
import {generateRandomKey, emptyFunction} from './OutlineUtils';
import {getWritableNode} from './OutlineNode';
import {createRootNode as createRoot} from './OutlineRootNode';
import {reconcilePlaceholder} from './OutlineReconciler';

export function createEditor(): OutlineEditor {
  const root = createRoot();
  const viewModel = new ViewModel({root});
  return new OutlineEditor(viewModel);
}

export type UpdateListener = (viewModel: ViewModel) => void;

export type DecoratorListener = (decorator: {[NodeKey]: ReactNode}) => void;

type PlaceholderConfig = $ReadOnly<{className?: null | string}>;

const NativePromise = window.Promise;

function updateEditor(
  editor: OutlineEditor,
  callbackFn: (view: View) => void,
  markAllTextNodesAsDirty: boolean,
  sync?: boolean,
): boolean {
  let pendingViewModel = editor._pendingViewModel;

  if (sync && pendingViewModel !== null) {
    commitPendingUpdates(editor);
    pendingViewModel = null;
  }
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
        currentPendingViewModel.selection = createSelection(
          currentPendingViewModel,
          editor,
        );
      }
      callbackFn(view);
      if (markAllTextNodesAsDirty) {
        const currentViewModel = editor._viewModel;
        const nodeMap = currentViewModel.nodeMap;
        const pendingNodeMap = currentPendingViewModel.nodeMap;
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
        applyTextTransforms(currentPendingViewModel, editor);
        garbageCollectDetachedNodes(currentPendingViewModel, editor);
      }
    },
    pendingViewModel,
    false,
  );
  const shouldUpdate =
    pendingViewModel.hasDirtyNodes() ||
    viewModelHasDirtySelectionOrNeedsSync(pendingViewModel, editor);

  if (!shouldUpdate) {
    editor._pendingViewModel = null;
    return false;
  }
  if (sync) {
    commitPendingUpdates(editor);
  } else if (viewModelWasCloned) {
    NativePromise.resolve().then(() => {
      commitPendingUpdates(editor);
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
  _textTransforms: Set<(node: TextNode, view: View) => void>;
  _registeredNodeTypes: Map<string, Class<OutlineNode>>;
  _needsReconcile: boolean;
  _nodeDecorators: {[NodeKey]: ReactNode};
  _pendingNodeDecorators: null | {[NodeKey]: ReactNode};
  _placeholderClassName: null | string;
  _placeholderText: string;
  _placeholderElement: null | HTMLElement;
  _textContent: string;

  constructor(viewModel: ViewModel) {
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
    this._decoratorListeners = new Set();
    // Handling of transform
    this._textTransforms = new Set();
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
    this._placeholderClassName = 'placeholder';
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
  addTextTransform(
    transformFn: (node: TextNode, view: View) => void,
  ): () => void {
    this._textTransforms.add(transformFn);
    updateEditor(this, emptyFunction, true);
    return () => {
      this._textTransforms.delete(transformFn);
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
  setEditorElement(editorElement: null | HTMLElement): void {
    this._editorElement = editorElement;
    if (editorElement === null) {
      this._keyToDOMMap.delete('root');
    } else {
      editorElement.setAttribute('data-outline-editor', 'true');
      this._keyToDOMMap.set('root', editorElement);
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
  update(callbackFn: (view: View) => void, sync?: boolean): boolean {
    return updateEditor(this, callbackFn, false, sync);
  }
  setPlaceholder(placeholderText: string, config?: PlaceholderConfig): void {
    const className = config && config.className;
    if (className !== undefined) {
      this._placeholderClassName = className;
    }
    const placeholderElement = this._placeholderElement;
    if (placeholderElement !== null) {
      // $FlowFixMe: placeholder elements always have a text node
      placeholderElement.firstChild.nodeValue = placeholderText;
    }
    this._placeholderText = placeholderText;
    reconcilePlaceholder(this, this._viewModel);
  }
}
