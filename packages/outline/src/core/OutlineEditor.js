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
  parseViewModel,
  errorOnProcessingTextNodeTransforms,
  applySelectionTransforms,
  triggerListeners,
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
  hashtag?: EditorThemeClassName,
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

export type TextNodeTransform = (node: TextNode, view: View) => void;

export type ErrorListener = (error: Error) => void;
export type UpdateListener = (viewModel: ViewModel) => void;
export type DecoratorListener = (decorator: {[NodeKey]: ReactNode}) => void;
export type RootListener = (
  element: null | HTMLElement,
  element: null | HTMLElement,
) => void;
export type MutationListener = (rootElement: null | HTMLElement) => void;

type Listeners = {
  decorator: Set<DecoratorListener>,
  error: Set<ErrorListener>,
  mutation: Set<MutationListener>,
  root: Set<RootListener>,
  update: Set<UpdateListener>,
};

export type ListenerType =
  | 'update'
  | 'error'
  | 'mutation'
  | 'root'
  | 'decorator';

export function resetEditor(editor: OutlineEditor): void {
  const root = createRoot();
  const nodeMap = new Map([['root', root]]);
  const emptyViewModel = new ViewModel(nodeMap);
  const keyToDOMMap = editor._keyToDOMMap;
  const rootElement = editor._rootElement;

  if (rootElement !== null) {
    // Clear all DOM content from the root element.
    rootElement.textContent = '';
  }
  editor._viewModel = emptyViewModel;
  editor._pendingViewModel = null;
  editor._compositionKey = null;
  keyToDOMMap.clear();
  editor._textContent = '';
  triggerListeners('update', editor, editor._viewModel);
  triggerListeners('mutation', editor, null);
}

export function createEditor(
  editorThemeClasses?: EditorThemeClasses,
): OutlineEditor {
  const root = createRoot();
  const nodeMap = new Map([['root', root]]);
  const viewModel = new ViewModel(nodeMap);
  // $FlowFixMe: use our declared type instead
  return new BaseOutlineEditor(viewModel, editorThemeClasses || {});
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
      },
      pendingViewModel,
      editor,
      false,
    );
  } catch (error) {
    // Report errors
    triggerListeners('error', editor, error);
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

function getSelf(self: BaseOutlineEditor): OutlineEditor {
  // $FlowFixMe: a hack to work around exporting a declaration
  return ((self: any): OutlineEditor);
}

class BaseOutlineEditor {
  _rootElement: null | HTMLElement;
  _viewModel: ViewModel;
  _pendingViewModel: null | ViewModel;
  _compositionKey: null | NodeKey;
  _deferred: Array<() => void>;
  _key: string;
  _keyToDOMMap: Map<NodeKey, HTMLElement>;
  _listeners: Listeners;
  _textNodeTransforms: Set<TextNodeTransform>;
  _nodeTypes: Map<string, Class<OutlineNode>>;
  _decorators: {[NodeKey]: ReactNode};
  _pendingDecorators: null | {[NodeKey]: ReactNode};
  _textContent: string;
  _editorThemeClasses: EditorThemeClasses;

  constructor(viewModel: ViewModel, editorThemeClasses: EditorThemeClasses) {
    // The root element associated with this editor
    this._rootElement = null;
    // The current view model
    this._viewModel = viewModel;
    // Handling of drafts and updates
    this._pendingViewModel = null;
    // Used to help co-ordinate selection and events
    this._compositionKey = null;
    this._deferred = [];
    // Used during reconciliation
    this._keyToDOMMap = new Map();
    // Listeners
    this._listeners = {
      decorator: new Set(),
      error: new Set(),
      mutation: new Set(),
      root: new Set(),
      update: new Set(),
    };
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
    this._compositionKey = nodeKey;
    updateEditor(getSelf(this), emptyFunction, false);
  }
  registerNodeType(nodeType: string, klass: Class<OutlineNode>): void {
    this._nodeTypes.set(nodeType, klass);
  }
  addListener(
    type: ListenerType,
    listener:
      | ErrorListener
      | UpdateListener
      | DecoratorListener
      | RootListener
      | MutationListener,
  ): () => void {
    const listenerSet = this._listeners[type];
    // $FlowFixMe: TODO refine this from the above types
    listenerSet.add(listener);

    const isRootType = type === 'root';
    if (isRootType) {
      // $FlowFixMe: TODO refine
      const rootListener: RootListener = (listener: any);
      rootListener(this._rootElement, null);
    }
    return () => {
      // $FlowFixMe: TODO refine this from the above types
      listenerSet.delete(listener);
      if (isRootType) {
        // $FlowFixMe: TODO refine
        const rootListener: RootListener = (listener: any);
        rootListener(null, this._rootElement);
      }
    };
  }
  addTextNodeTransform(listener: TextNodeTransform): () => void {
    this._textNodeTransforms.add(listener);
    updateEditor(getSelf(this), emptyFunction, true);
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
  getRootElement(): null | HTMLElement {
    return this._rootElement;
  }
  getTextContent(): string {
    return this._textContent;
  }
  setRootElement(nextRootElement: null | HTMLElement): void {
    const prevRootElement = this._rootElement;
    if (nextRootElement !== prevRootElement) {
      if (nextRootElement === null || prevRootElement !== null) {
        resetEditor(getSelf(this));
      }
      this._rootElement = nextRootElement;
      if (nextRootElement !== null) {
        nextRootElement.setAttribute('data-outline-editor', 'true');
        this._keyToDOMMap.set('root', nextRootElement);
        commitPendingUpdates(getSelf(this));
      }
      triggerListeners('root', getSelf(this), nextRootElement, prevRootElement);
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
      commitPendingUpdates(getSelf(this));
    }
    this._pendingViewModel = viewModel;
    commitPendingUpdates(getSelf(this));
  }
  parseViewModel(stringifiedViewModel: string): ViewModel {
    return parseViewModel(stringifiedViewModel, getSelf(this));
  }
  update(updateFn: (view: View) => void, callbackFn?: () => void): boolean {
    errorOnProcessingTextNodeTransforms();
    return updateEditor(getSelf(this), updateFn, false, callbackFn);
  }
  focus(callbackFn?: () => void): void {
    const rootElement = this._rootElement;
    if (rootElement !== null) {
      // This ensures that iOS does not trigger caps lock upon focus
      rootElement.setAttribute('autocapitalize', 'off');
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
          rootElement.removeAttribute('autocapitalize');
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
    // $FlowFixMe: root is always in the Map
    const root = ((nodeMap.get('root'): any): RootNode);
    const topBlockIDs = root.__children;
    const topBlockIDsLength = topBlockIDs.length;
    if (topBlockIDsLength > 1) {
      return false;
    }
    for (let i = 0; i < topBlockIDsLength; i++) {
      const topBlock = nodeMap.get(topBlockIDs[i]);

      if (topBlock !== undefined && topBlock.__type !== 'paragraph') {
        return false;
      }
    }
    return true;
  }
}

// We export this to make the addListener types work properly.
// For some reason, we can't do this via an interface without
// Flow messing up the types. It's hacky, but it improves DX.
declare export class OutlineEditor {
  _rootElement: null | HTMLElement;
  _viewModel: ViewModel;
  _pendingViewModel: null | ViewModel;
  _compositionKey: null | NodeKey;
  _deferred: Array<() => void>;
  _key: string;
  _keyToDOMMap: Map<NodeKey, HTMLElement>;
  _listeners: Listeners;
  _textNodeTransforms: Set<TextNodeTransform>;
  _nodeTypes: Map<string, Class<OutlineNode>>;
  _decorators: {[NodeKey]: ReactNode};
  _pendingDecorators: null | {[NodeKey]: ReactNode};
  _textContent: string;
  _editorThemeClasses: EditorThemeClasses;

  isComposing(): boolean;
  setCompositionKey(compositionKey: NodeKey | null): void;
  registerNodeType(nodeType: string, klass: Class<OutlineNode>): void;
  addListener(type: 'error', listener: ErrorListener): () => void;
  addListener(type: 'update', listener: UpdateListener): () => void;
  addListener(type: 'root', listener: RootListener): () => void;
  addListener(type: 'decorator', listener: DecoratorListener): () => void;
  addListener(type: 'mutation', listener: MutationListener): () => void;
  addTextNodeTransform(listener: TextNodeTransform): () => void;
  getDecorators(): {[NodeKey]: ReactNode};
  getEditorKey(): string;
  getRootElement(): null | HTMLElement;
  setRootElement(rootElement: null | HTMLElement): void;
  getTextContent(): string;
  getElementByKey(key: NodeKey): null | HTMLElement;
  getViewModel(): ViewModel;
  setViewModel(viewModel: ViewModel): void;
  parseViewModel(stringifiedViewModel: string): ViewModel;
  update(updateFn: (view: View) => void, callbackFn?: () => void): boolean;
  focus(callbackFn?: () => void): void;
  canShowPlaceholder(): boolean;
}
