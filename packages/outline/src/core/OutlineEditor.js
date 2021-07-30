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

import {isBlockNode, isTextNode, TextNode} from '.';
import {
  cloneViewModel,
  viewModelHasDirtySelection,
  ViewModel,
  commitPendingUpdates,
  parseViewModel,
  errorOnProcessingTextNodeTransforms,
  triggerListeners,
  preparePendingViewUpdate,
} from './OutlineView';
import {emptyFunction, scheduleMicroTask} from './OutlineUtils';
import {createRootNode as createRoot} from './OutlineRootNode';
import {LineBreakNode} from './OutlineLineBreakNode';
import {RootNode} from './OutlineRootNode';

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

export type ErrorListener = (error: Error, updateName: string) => void;
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
  editor._rootElement = null;
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
  updateName: string,
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

  const error = preparePendingViewUpdate(
    pendingViewModel,
    updateFn,
    viewModelWasCloned,
    markAllTextNodesAsDirty,
    editor,
  );

  if (error !== null) {
    // Report errors
    triggerListeners('error', editor, error, updateName);
    // Restore existing view model to the DOM
    const currentViewModel = editor._viewModel;
    currentViewModel.markDirty();
    editor._pendingViewModel = currentViewModel;
    commitPendingUpdates(editor, 'UpdateRecover');
    return false;
  }

  const shouldUpdate =
    pendingViewModel.hasDirtyNodes() ||
    viewModelHasDirtySelection(pendingViewModel, editor);

  if (!shouldUpdate) {
    if (viewModelWasCloned) {
      editor._pendingViewModel = null;
    }
    return false;
  }
  if (pendingViewModel._flushSync) {
    pendingViewModel._flushSync = false;
    commitPendingUpdates(editor, updateName);
  } else if (viewModelWasCloned) {
    scheduleMicroTask(() => {
      commitPendingUpdates(editor, updateName);
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
    // React node decorators for portals
    this._decorators = {};
    this._pendingDecorators = null;
    // Editor fast-path for text content
    this._textContent = '';
  }
  isComposing(): boolean {
    return this._compositionKey != null;
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
    updateEditor(getSelf(this), emptyFunction, true, 'addTextNodeTransform');
    return () => {
      this._textNodeTransforms.delete(listener);
    };
  }
  getDecorators(): {[NodeKey]: ReactNode} {
    return this._decorators;
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
        commitPendingUpdates(getSelf(this), 'setRootElement');
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
      commitPendingUpdates(getSelf(this), 'setViewModel #1');
    }
    this._pendingViewModel = viewModel;
    commitPendingUpdates(getSelf(this), 'setViewModel #2');
  }
  parseViewModel(stringifiedViewModel: string): ViewModel {
    return parseViewModel(stringifiedViewModel, getSelf(this));
  }
  update(
    updateFn: (view: View) => void,
    updateName: string,
    callbackFn?: () => void,
  ): boolean {
    errorOnProcessingTextNodeTransforms();
    return updateEditor(getSelf(this), updateFn, false, updateName, callbackFn);
  }
  focus(callbackFn?: () => void): void {
    const rootElement = this._rootElement;
    if (rootElement !== null) {
      rootElement.focus({preventScroll: true});
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
        'focus',
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

      if (isBlockNode(topBlock)) {
        if (topBlock.__type !== 'paragraph') {
          return false;
        }
        const children = topBlock.__children;
        for (let s = 0; s < children.length; s++) {
          const child = nodeMap.get(children[s]);
          if (!isTextNode(child)) {
            return false;
          }
        }
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
  _keyToDOMMap: Map<NodeKey, HTMLElement>;
  _listeners: Listeners;
  _textNodeTransforms: Set<TextNodeTransform>;
  _nodeTypes: Map<string, Class<OutlineNode>>;
  _decorators: {[NodeKey]: ReactNode};
  _pendingDecorators: null | {[NodeKey]: ReactNode};
  _textContent: string;
  _editorThemeClasses: EditorThemeClasses;

  isComposing(): boolean;
  registerNodeType(nodeType: string, klass: Class<OutlineNode>): void;
  addListener(type: 'error', listener: ErrorListener): () => void;
  addListener(type: 'update', listener: UpdateListener): () => void;
  addListener(type: 'root', listener: RootListener): () => void;
  addListener(type: 'decorator', listener: DecoratorListener): () => void;
  addListener(type: 'mutation', listener: MutationListener): () => void;
  addTextNodeTransform(listener: TextNodeTransform): () => void;
  getDecorators(): {[NodeKey]: ReactNode};
  getRootElement(): null | HTMLElement;
  setRootElement(rootElement: null | HTMLElement): void;
  getTextContent(): string;
  getElementByKey(key: NodeKey): null | HTMLElement;
  getViewModel(): ViewModel;
  setViewModel(viewModel: ViewModel): void;
  parseViewModel(stringifiedViewModel: string): ViewModel;
  update(
    updateFn: (view: View) => void,
    updateName: string,
    callbackFn?: () => void,
  ): boolean;
  focus(callbackFn?: () => void): void;
  canShowPlaceholder(): boolean;
}
