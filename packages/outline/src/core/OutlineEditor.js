/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineNode, NodeKey} from './OutlineNode';
import type {Node as ReactNode} from 'react';
import type {View} from './OutlineUpdates';

import {
  errorOnPreparingPendingViewUpdate,
  commitPendingUpdates,
  parseEditorState,
  errorOnProcessingTextNodeTransforms,
} from './OutlineUpdates';
import {isBlockNode, isTextNode, TextNode} from '.';
import {EditorState, createEmptyEditorState} from './OutlineEditorState';
import {emptyFunction} from './OutlineUtils';
import {LineBreakNode} from './OutlineLineBreakNode';
import {RootNode} from './OutlineRootNode';
import {NO_DIRTY_NODES, FULL_RECONCILE} from './OutlineConstants';
import {flushRootMutations, initMutationObserver} from './OutlineMutations';
import {triggerListeners} from './OutlineListeners';
import {beginUpdate} from './OutlineUpdates';
import invariant from 'shared/invariant';

export type EditorThemeClassName = string;

export type TextNodeThemeClasses = {
  base?: EditorThemeClassName,
  bold?: EditorThemeClassName,
  underline?: EditorThemeClassName,
  strikethrough?: EditorThemeClassName,
  underlineStrikethrough?: EditorThemeClassName,
  italic?: EditorThemeClassName,
  code?: EditorThemeClassName,
};

export type EditorThemeClasses = {
  root?: EditorThemeClassName,
  text?: TextNodeThemeClasses,
  paragraph?: EditorThemeClassName,
  image?: EditorThemeClassName,
  list?: {
    ul?: EditorThemeClassName,
    ol?: EditorThemeClassName,
  },
  nestedList?: {
    listitem: EditorThemeClassName,
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

export type EditorConfig<EditorContext> = {
  theme: EditorThemeClasses,
  context: EditorContext,
};

export type TextNodeTransform = (node: TextNode, view: View) => void;

export type ErrorListener = (error: Error, log: Array<string>) => void;
export type UpdateListener = ({
  editorState: EditorState,
  dirty: boolean,
  dirtyNodes: Set<NodeKey>,
  log: Array<string>,
}) => void;
export type DecoratorListener = (decorator: {[NodeKey]: ReactNode}) => void;
export type RootListener = (
  element: null | HTMLElement,
  element: null | HTMLElement,
) => void;
export type TextMutationListener = (
  editor: OutlineEditor,
  view: View,
  mutation: TextMutation,
) => void;

export type TextMutation = {
  node: TextNode,
  anchorOffset: null | number,
  focusOffset: null | number,
  text: string,
};

type Listeners = {
  decorator: Set<DecoratorListener>,
  error: Set<ErrorListener>,
  textmutation: Set<TextMutationListener>,
  root: Set<RootListener>,
  update: Set<UpdateListener>,
};

export type ListenerType =
  | 'update'
  | 'error'
  | 'textmutation'
  | 'root'
  | 'decorator';

export function resetEditor(
  editor: OutlineEditor,
  prevRootElement: null | HTMLElement,
  nextRootElement: null | HTMLElement,
  pendingEditorState: EditorState,
): void {
  const keyNodeMap = editor._keyToDOMMap;
  keyNodeMap.clear();
  editor._editorState = createEmptyEditorState();
  editor._pendingEditorState = pendingEditorState;
  editor._compositionKey = null;
  editor._dirtyType = NO_DIRTY_NODES;
  editor._dirtyNodes = new Set();
  editor._dirtySubTrees = new Set();
  editor._textContent = '';
  editor._log = [];
  const observer = editor._observer;
  if (observer !== null) {
    observer.disconnect();
    editor._observer = null;
  }
  // Remove all the DOM nodes from the root element
  if (prevRootElement !== null) {
    prevRootElement.textContent = '';
  }
  if (nextRootElement !== null) {
    nextRootElement.textContent = '';
    keyNodeMap.set('root', nextRootElement);
  }
}

export function createEditor<EditorContext>(editorConfig?: {
  initialEditorState?: EditorState,
  theme?: EditorThemeClasses,
  context?: EditorContext,
}): OutlineEditor {
  const config = editorConfig || {};
  const theme = config.theme || {};
  const context = config.context || {};
  const editorState = createEmptyEditorState();
  const initialEditorState = config.initialEditorState;
  // $FlowFixMe: use our declared type instead
  const editor: editor = new BaseOutlineEditor(editorState, {
    // $FlowFixMe: we use our internal type to simpify the generics
    context,
    theme,
  });
  if (initialEditorState !== undefined) {
    editor._pendingEditorState = initialEditorState;
    editor._dirtyType = FULL_RECONCILE;
  }
  return editor;
}

function getSelf(self: BaseOutlineEditor): OutlineEditor {
  // $FlowFixMe: a hack to work around exporting a declaration
  return ((self: any): OutlineEditor);
}

class BaseOutlineEditor {
  _rootElement: null | HTMLElement;
  _editorState: EditorState;
  _pendingEditorState: null | EditorState;
  _compositionKey: null | NodeKey;
  _deferred: Array<() => void>;
  _keyToDOMMap: Map<NodeKey, HTMLElement>;
  _listeners: Listeners;
  _textNodeTransforms: Set<TextNodeTransform>;
  _nodeTypes: Map<string, Class<OutlineNode>>;
  _decorators: {[NodeKey]: ReactNode};
  _pendingDecorators: null | {[NodeKey]: ReactNode};
  _textContent: string;
  _config: EditorConfig<{...}>;
  _dirtyType: 0 | 1 | 2;
  _dirtyNodes: Set<NodeKey>;
  _dirtySubTrees: Set<NodeKey>;
  _observer: null | MutationObserver;
  _log: Array<string>;

  constructor(editorState: EditorState, config: EditorConfig<{...}>) {
    // The root element associated with this editor
    this._rootElement = null;
    // The current editor state
    this._editorState = editorState;
    // Handling of drafts and updates
    this._pendingEditorState = null;
    // Used to help co-ordinate selection and events
    this._compositionKey = null;
    this._deferred = [];
    // Used during reconciliation
    this._keyToDOMMap = new Map();
    // Listeners
    this._listeners = {
      decorator: new Set(),
      error: new Set(),
      textmutation: new Set(),
      root: new Set(),
      update: new Set(),
    };
    // Editor configuration for theme/context.
    this._config = config;
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
    // Used to optimize reconcilation
    this._dirtyType = NO_DIRTY_NODES;
    this._dirtyNodes = new Set();
    this._dirtySubTrees = new Set();
    // Handling of DOM mutations
    this._observer = null;
    // Logging for updates
    this._log = [];
  }
  getObserver(): null | MutationObserver {
    return this._observer;
  }
  isComposing(): boolean {
    return this._compositionKey != null;
  }
  isEmpty(trim: boolean = true): boolean {
    if (this.isComposing()) {
      return false;
    }
    let text = this.getCurrentTextContent();
    if (trim) {
      text = text.trim();
    }
    return text === '';
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
      | TextMutationListener,
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
    beginUpdate(getSelf(this), emptyFunction, true);
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
  getCurrentTextContent(): string {
    return this._textContent;
  }
  getLatestTextContent(callback: (text: string) => void): void {
    errorOnPreparingPendingViewUpdate('Editor.getLatestTextContent()');
    if (this._pendingEditorState === null) {
      callback(this._textContent);
      return;
    }
    this._deferred.push(() => callback(this._textContent));
  }
  setRootElement(nextRootElement: null | HTMLElement): void {
    const prevRootElement = this._rootElement;
    if (nextRootElement !== prevRootElement) {
      const pendingEditorState = this._pendingEditorState || this._editorState;
      this._rootElement = nextRootElement;

      resetEditor(
        getSelf(this),
        prevRootElement,
        nextRootElement,
        pendingEditorState,
      );
      if (prevRootElement !== null) {
        // $FlowFixMe: internal field
        prevRootElement.__outlineEditor = null;
      }
      if (nextRootElement !== null) {
        nextRootElement.setAttribute('data-outline-editor', 'true');
        this._dirtyType = FULL_RECONCILE;
        initMutationObserver(getSelf(this));
        commitPendingUpdates(getSelf(this));
        // $FlowFixMe: internal field
        nextRootElement.__outlineEditor = this;
      }
      triggerListeners('root', getSelf(this), nextRootElement, prevRootElement);
    }
  }
  getElementByKey(key: NodeKey): HTMLElement | null {
    return this._keyToDOMMap.get(key) || null;
  }
  getEditorState(): EditorState {
    return this._editorState;
  }
  setEditorState(editorState: EditorState): void {
    if (editorState.isEmpty()) {
      invariant(
        false,
        "setEditorState: the editor state is empty. Ensure the editor state's root node never becomes empty.",
      );
    }
    const observer = this._observer;
    if (observer !== null) {
      const mutations = observer.takeRecords();
      flushRootMutations(getSelf(this), mutations, observer);
    }
    if (this._pendingEditorState !== null) {
      commitPendingUpdates(getSelf(this));
    }
    this._pendingEditorState = editorState;
    this._dirtyType = FULL_RECONCILE;
    this._compositionKey = null;
    commitPendingUpdates(getSelf(this));
  }
  parseEditorState(stringifiedEditorState: string): EditorState {
    return parseEditorState(stringifiedEditorState, getSelf(this));
  }
  update(updateFn: (view: View) => void, callbackFn?: () => void): boolean {
    errorOnProcessingTextNodeTransforms();
    return beginUpdate(getSelf(this), updateFn, false, callbackFn);
  }
  focus(callbackFn?: () => void): void {
    const rootElement = this._rootElement;
    if (rootElement !== null) {
      // This ensures that iOS does not trigger caps lock upon focus
      rootElement.setAttribute('autocapitalize', 'off');
      this.update(
        (view: View) => {
          const selection = view.getSelection();
          const root = view.getRoot();
          if (selection !== null) {
            // Marking the selection dirty will force the selection back to it
            selection.dirty = true;
          } else if (root.getChildrenSize() !== 0) {
            root.selectEnd();
          }
        },
        () => {
          if (document.activeElement !== rootElement) {
            rootElement.focus({preventScroll: true});
          }
          rootElement.removeAttribute('autocapitalize');
          if (callbackFn) {
            callbackFn();
          }
        },
      );
    }
  }
  canShowPlaceholder(): boolean {
    if (!this.isEmpty(false)) {
      return false;
    }
    const nodeMap = this._editorState._nodeMap;
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
  _editorState: EditorState;
  _pendingEditorState: null | EditorState;
  _compositionKey: null | NodeKey;
  _deferred: Array<() => void>;
  _keyToDOMMap: Map<NodeKey, HTMLElement>;
  _listeners: Listeners;
  _textNodeTransforms: Set<TextNodeTransform>;
  _nodeTypes: Map<string, Class<OutlineNode>>;
  _decorators: {[NodeKey]: ReactNode};
  _pendingDecorators: null | {[NodeKey]: ReactNode};
  _textContent: string;
  _config: EditorConfig<{...}>;
  _dirtyType: 0 | 1 | 2;
  _dirtyNodes: Set<NodeKey>;
  _dirtySubTrees: Set<NodeKey>;
  _observer: null | MutationObserver;
  _log: Array<string>;

  getObserver(): null | MutationObserver;
  isComposing(): boolean;
  isEmpty(trim?: boolean): boolean;
  registerNodeType(nodeType: string, klass: Class<OutlineNode>): void;
  addListener(type: 'error', listener: ErrorListener): () => void;
  addListener(type: 'update', listener: UpdateListener): () => void;
  addListener(type: 'root', listener: RootListener): () => void;
  addListener(type: 'decorator', listener: DecoratorListener): () => void;
  addListener(type: 'textmutation', listener: TextMutationListener): () => void;
  addTextNodeTransform(listener: TextNodeTransform): () => void;
  getDecorators(): {[NodeKey]: ReactNode};
  getRootElement(): null | HTMLElement;
  setRootElement(rootElement: null | HTMLElement): void;
  getCurrentTextContent(): string;
  getLatestTextContent((text: string) => void): () => void;
  getElementByKey(key: NodeKey): null | HTMLElement;
  getEditorState(): EditorState;
  setEditorState(editorState: EditorState): void;
  parseEditorState(stringifiedEditorState: string): EditorState;
  update(updateFn: (view: View) => void, callbackFn?: () => void): boolean;
  focus(callbackFn?: () => void): void;
  canShowPlaceholder(): boolean;
}

export function getEditorFromElement(element: Element): null | OutlineEditor {
  // $FlowFixMe: internal field
  const possibleEditor: void | OutlineEditor = element.__outlineEditor;
  return possibleEditor != null ? possibleEditor : null;
}
