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
import type {State} from './OutlineUpdates';
import type {EditorState} from './OutlineEditorState';
import type {DecoratorNode} from './OutlineDecoratorNode';
import type {BlockNode} from './OutlineBlockNode';

import {
  commitPendingUpdates,
  parseEditorState,
  triggerListeners,
  updateEditor,
} from './OutlineUpdates';
import {TextNode, getSelection, getRoot} from '.';
import {createEmptyEditorState} from './OutlineEditorState';
import {LineBreakNode} from './OutlineLineBreakNode';
import {RootNode} from './OutlineRootNode';
import {NO_DIRTY_NODES, FULL_RECONCILE} from './OutlineConstants';
import {flushRootMutations, initMutationObserver} from './OutlineMutations';
import {
  generateRandomKey,
  getEditorStateTextContent,
  markAllNodesAsDirty,
} from './OutlineUtils';
import invariant from 'shared/invariant';

export type EditorThemeClassName = string;

export type TypeToKlass = Map<string, Class<OutlineNode>>;
export type KlassToType = Map<Class<OutlineNode>, string>;

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
    list?: EditorThemeClassName,
    listitem?: EditorThemeClassName,
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

export type ErrorListener = (error: Error, log: Array<string>) => void;
export type UpdateListener = ({
  prevEditorState: EditorState,
  editorState: EditorState,
  dirtyLeaves: Set<NodeKey>,
  dirtyBlocks: Map<NodeKey, IntentionallyMarkedAsDirtyBlock>,
  log: Array<string>,
}) => void;
export type DecoratorListener = (decorator: {[NodeKey]: ReactNode}) => void;
export type RootListener = (
  element: null | HTMLElement,
  element: null | HTMLElement,
) => void;
export type TextMutationListener = (mutation: TextMutation) => void;
export type TextContentListener = (text: string) => void;

export type TextTransform = (node: TextNode, state: State) => void;
export type DecoratorTransform = (node: DecoratorNode, state: State) => void;
export type BlockTransform = (node: BlockNode, state: State) => void;
export type RootTransform = (node: RootNode, state: State) => void;

export type TextMutation = {
  node: TextNode,
  anchorOffset: null | number,
  focusOffset: null | number,
  text: string,
};

type Listeners = {
  decorator: Set<DecoratorListener>,
  error: Set<ErrorListener>,
  textcontent: Set<TextContentListener>,
  textmutation: Set<TextMutationListener>,
  root: Set<RootListener>,
  update: Set<UpdateListener>,
};

type Transforms = {
  text: Set<TextTransform>,
  decorator: Set<DecoratorTransform>,
  block: Set<BlockTransform>,
  root: Set<RootTransform>,
};

export type ListenerType =
  | 'update'
  | 'error'
  | 'textmutation'
  | 'root'
  | 'decorator'
  | 'textcontent';

export type TransformerType = 'text' | 'decorator' | 'block' | 'root';

export type IntentionallyMarkedAsDirtyBlock = boolean;

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
  editor._cloneNotNeeded.clear();
  editor._dirtyLeaves = new Set();
  editor._dirtyBlocks.clear();
  editor._log = [];
  editor._updates = [];
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
  _updates: Array<[(state: State) => void, void | (() => void)]>;
  _updating: boolean;
  _listeners: Listeners;
  _transforms: Transforms;
  _typeToKlass: TypeToKlass;
  _klassToType: KlassToType;
  _decorators: {[NodeKey]: ReactNode};
  _pendingDecorators: null | {[NodeKey]: ReactNode};
  _textContent: string;
  _config: EditorConfig<{...}>;
  _dirtyType: 0 | 1 | 2;
  _cloneNotNeeded: Set<NodeKey>;
  _dirtyLeaves: Set<NodeKey>;
  _dirtyBlocks: Map<NodeKey, IntentionallyMarkedAsDirtyBlock>;
  _observer: null | MutationObserver;
  _log: Array<string>;
  _key: string;

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
    this._updates = [];
    this._updating = false;
    // Listeners
    this._listeners = {
      decorator: new Set(),
      error: new Set(),
      textcontent: new Set(),
      textmutation: new Set(),
      root: new Set(),
      update: new Set(),
    };
    // Transforms
    this._transforms = {
      text: new Set(),
      decorator: new Set(),
      block: new Set(),
      root: new Set(),
    };
    // Editor configuration for theme/context.
    this._config = config;
    // Mapping of types to their nodes
    this._typeToKlass = new Map([
      ['text', TextNode],
      ['linebreak', LineBreakNode],
      ['root', RootNode],
    ]);
    this._klassToType = new Map([
      [TextNode, 'text'],
      [LineBreakNode, 'linebreak'],
      [RootNode, 'root'],
    ]);
    // React node decorators for portals
    this._decorators = {};
    this._pendingDecorators = null;
    // Used to optimize reconcilation
    this._dirtyType = NO_DIRTY_NODES;
    this._cloneNotNeeded = new Set();
    this._dirtyLeaves = new Set();
    this._dirtyBlocks = new Map();
    // Handling of DOM mutations
    this._observer = null;
    // Logging for updates
    this._log = [];
    // Used for identifying owning editors
    this._key = generateRandomKey();
  }
  isComposing(): boolean {
    return this._compositionKey != null;
  }
  registerNodeType(nodeType: string, klass: Class<OutlineNode>): void {
    this._typeToKlass.set(nodeType, klass);
    this._klassToType.set(klass, nodeType);
  }
  addListener(
    type: ListenerType,
    listener:
      | ErrorListener
      | UpdateListener
      | DecoratorListener
      | RootListener
      | TextMutationListener
      | TextContentListener,
  ): () => void {
    const listenerSet = this._listeners[type];
    // $FlowFixMe: TODO refine this from the above types
    listenerSet.add(listener);

    const isRootType = type === 'root';
    const isTextContentType = type === 'textcontent';
    if (isRootType) {
      // $FlowFixMe: TODO refine
      const rootListener: RootListener = listener;
      rootListener(this._rootElement, null);
    } else if (isTextContentType) {
      const textContent = getEditorStateTextContent(this._editorState);
      // $FlowFixMe: TODO refine
      const textContentListener: TextContentListener = listener;
      textContentListener(textContent);
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
  addTransform(type: TransformerType, transform: TextTransform): () => void {
    const transformsSet = this._transforms[type];
    // $FlowFixMe: TODO refine this from the above types
    transformsSet.add(transform);
    markAllNodesAsDirty(getSelf(this), type);

    return () => {
      // $FlowFixMe: TODO refine this from the above types
      transformsSet.delete(transform);
    };
  }
  getDecorators(): {[NodeKey]: ReactNode} {
    return this._decorators;
  }
  getRootElement(): null | HTMLElement {
    return this._rootElement;
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
      triggerListeners(
        'root',
        getSelf(this),
        false,
        nextRootElement,
        prevRootElement,
      );
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
    flushRootMutations(getSelf(this));
    const pendingEditorState = this._pendingEditorState;
    if (pendingEditorState !== null && !pendingEditorState.isEmpty()) {
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
  update(updateFn: (state: State) => void, callbackFn?: () => void): void {
    updateEditor(getSelf(this), updateFn, false, callbackFn);
  }
  focus(callbackFn?: () => void): void {
    const rootElement = this._rootElement;
    if (rootElement !== null) {
      // This ensures that iOS does not trigger caps lock upon focus
      rootElement.setAttribute('autocapitalize', 'off');
      updateEditor(
        getSelf(this),
        () => {
          const selection = getSelection();
          const root = getRoot();
          if (selection !== null) {
            // Marking the selection dirty will force the selection back to it
            selection.dirty = true;
          } else if (root.getChildrenSize() !== 0) {
            root.selectEnd();
          }
        },
        true,
        () => {
          rootElement.removeAttribute('autocapitalize');
          if (callbackFn) {
            callbackFn();
          }
        },
      );
    }
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
  _updates: Array<[(state: State) => void, void | (() => void)]>;
  _updating: boolean;
  _keyToDOMMap: Map<NodeKey, HTMLElement>;
  _listeners: Listeners;
  _transforms: Transforms;
  _typeToKlass: TypeToKlass;
  _klassToType: KlassToType;
  _decorators: {[NodeKey]: ReactNode};
  _pendingDecorators: null | {[NodeKey]: ReactNode};
  _config: EditorConfig<{...}>;
  _dirtyType: 0 | 1 | 2;
  _cloneNotNeeded: Set<NodeKey>;
  _dirtyLeaves: Set<NodeKey>;
  _dirtyBlocks: Map<NodeKey, IntentionallyMarkedAsDirtyBlock>;
  _observer: null | MutationObserver;
  _log: Array<string>;
  _key: string;

  isComposing(): boolean;
  registerNodeType(nodeType: string, klass: Class<OutlineNode>): void;
  addListener(type: 'error', listener: ErrorListener): () => void;
  addListener(type: 'update', listener: UpdateListener): () => void;
  addListener(type: 'root', listener: RootListener): () => void;
  addListener(type: 'decorator', listener: DecoratorListener): () => void;
  addListener(type: 'textmutation', listener: TextMutationListener): () => void;
  addListener(type: 'textcontent', listener: TextContentListener): () => void;
  addTransform(type: 'text', listener: TextTransform): () => void;
  addTransform(type: 'decorator', listener: DecoratorTransform): () => void;
  addTransform(type: 'block', listener: BlockTransform): () => void;
  addTransform(type: 'root', listener: RootTransform): () => void;
  getDecorators(): {[NodeKey]: ReactNode};
  getRootElement(): null | HTMLElement;
  setRootElement(rootElement: null | HTMLElement): void;
  getElementByKey(key: NodeKey): null | HTMLElement;
  getEditorState(): EditorState;
  setEditorState(editorState: EditorState): void;
  parseEditorState(stringifiedEditorState: string): EditorState;
  update(updateFn: (state: State) => void, callbackFn?: () => void): boolean;
  focus(callbackFn?: () => void): void;
}
