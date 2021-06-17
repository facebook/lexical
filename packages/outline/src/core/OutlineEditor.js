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
} from './OutlineView';
import {createSelection} from './OutlineSelection';
import {
  generateRandomKey,
  emptyFunction,
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
  const editorElement = editor._editorElement;
  const placeholderElement = editor._placeholderElement;
  if (placeholderElement !== null && editorElement !== null) {
    editorElement.removeChild(placeholderElement);
  }
  editor._compositionKey = null;
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
              getWritableNode(node);
            }
          }
        }
        applySelectionTransforms(currentPendingViewModel, editor);
        if (currentPendingViewModel.hasDirtyNodes()) {
          applyTextTransforms(currentPendingViewModel, editor);
          garbageCollectDetachedNodes(currentPendingViewModel, editor);
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
  _decoratorListeners: Set<DecoratorListener>;
  _textNodeTransforms: Set<TextNodeTransform>;
  _nodeTypes: Map<string, Class<OutlineNode>>;
  _decorators: {[NodeKey]: ReactNode};
  _pendingDecorators: null | {[NodeKey]: ReactNode};
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
    // Used for rendering placeholder text
    this._placeholderText = '';
    this._placeholderElement = null;
    // Editor fast-path for text content
    this._textContent = '';
  }
  isComposing(): boolean {
    return this._compositionKey != null;
  }
  setCompositionKey(nodeKey: null | NodeKey): void {
    if (nodeKey === null) {
      this._compositionKey = null;
      updateEditor(this, emptyFunction, true);
      const pendingViewModel = this._pendingViewModel;
      if (pendingViewModel !== null) {
        pendingViewModel.markDirty();
      }
    } else {
      updateEditor(this, emptyFunction, true);
    }
    this._deferred.push(() => {
      this._compositionKey = nodeKey;
      reconcilePlaceholder(this, this._viewModel);
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
  addEditorElementListener(listener: EditorElementListener): () => void {
    this._elementListeners.add(listener);
    listener(this._editorElement);

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
    if (nextEditorElement === prevEditorElement) {
      return;
    }
    this._editorElement = nextEditorElement;
    if (nextEditorElement === null) {
      if (prevEditorElement !== null) {
        prevEditorElement.textContent = '';
      }
      resetEditor(this);
    } else {
      if (prevEditorElement !== null) {
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
  setPlaceholder(placeholderText: string): void {
    const placeholderElement = this._placeholderElement;
    if (placeholderElement !== null) {
      // $FlowFixMe: placeholder elements always have a text node
      placeholderElement.firstChild.nodeValue = placeholderText;
    }
    this._placeholderText = placeholderText;
    reconcilePlaceholder(this, this._viewModel);
  }
  focus(callbackFn?: () => void): void {
    this.update((view: View) => {
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
    }, callbackFn);
  }
}
