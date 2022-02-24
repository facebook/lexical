/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {EditorState} from './LexicalEditorState';
import type {DOMConversion, LexicalNode, NodeKey} from './LexicalNode';
import type {Node as ReactNode} from 'react';

import invariant from 'shared/invariant';

import {$getRoot, $getSelection, TextNode} from '.';
import {FULL_RECONCILE, NO_DIRTY_NODES} from './LexicalConstants';
import {createEmptyEditorState} from './LexicalEditorState';
import {addRootElementEvents, removeRootElementEvents} from './LexicalEvents';
import {flushRootMutations, initMutationObserver} from './LexicalMutations';
import {
  commitPendingUpdates,
  parseEditorState,
  triggerCommandListeners,
  triggerListeners,
  updateEditor,
} from './LexicalUpdates';
import {
  createUID,
  generateRandomKey,
  markAllNodesAsDirty,
} from './LexicalUtils';
import {LineBreakNode} from './nodes/base/LexicalLineBreakNode';
import {ParagraphNode} from './nodes/base/LexicalParagraphNode';
import {RootNode} from './nodes/base/LexicalRootNode';

export type EditorThemeClassName = string;

export type TextNodeThemeClasses = {
  base?: EditorThemeClassName,
  bold?: EditorThemeClassName,
  code?: EditorThemeClassName,
  italic?: EditorThemeClassName,
  strikethrough?: EditorThemeClassName,
  underline?: EditorThemeClassName,
  underlineStrikethrough?: EditorThemeClassName,
};

export type EditorUpdateOptions = {|
  onUpdate?: () => void,
  skipTransforms?: true,
  tag?: string,
|};

export type EditorSetOptions = {|
  tag?: string,
|};

export type EditorThemeClasses = {
  code?: EditorThemeClassName,
  codeHighlight?: {[string]: EditorThemeClassName},
  hashtag?: EditorThemeClassName,
  heading?: {
    h1?: EditorThemeClassName,
    h2?: EditorThemeClassName,
    h3?: EditorThemeClassName,
    h4?: EditorThemeClassName,
    h5?: EditorThemeClassName,
  },
  image?: EditorThemeClassName,
  link?: EditorThemeClassName,
  list?: {
    listitem: EditorThemeClassName,
    nested: {
      list?: EditorThemeClassName,
      listitem?: EditorThemeClassName,
    },
    ol?: EditorThemeClassName,
    ol1?: EditorThemeClassName,
    ol2?: EditorThemeClassName,
    ol3?: EditorThemeClassName,
    ol4?: EditorThemeClassName,
    ol5?: EditorThemeClassName,
    ul?: EditorThemeClassName,
    ul1?: EditorThemeClassName,
    ul2?: EditorThemeClassName,
    ul3?: EditorThemeClassName,
    ul4?: EditorThemeClassName,
    ul5?: EditorThemeClassName,
  },
  ltr?: EditorThemeClassName,
  paragraph?: EditorThemeClassName,
  quote?: EditorThemeClassName,
  root?: EditorThemeClassName,
  rtl?: EditorThemeClassName,
  table?: EditorThemeClassName,
  tableCell?: EditorThemeClassName,
  tableCellHeader?: EditorThemeClassName,
  tableRow?: EditorThemeClassName,
  text?: TextNodeThemeClasses,
  // Handle other generic values
  [string]: EditorThemeClassName | {[string]: EditorThemeClassName},
};

export type EditorConfig<EditorContext> = {
  context: EditorContext,
  disableEvents?: boolean,
  namespace: string,
  theme: EditorThemeClasses,
};

export type RegisteredNodes = Map<string, RegisteredNode>;
export type RegisteredNode = {
  klass: Class<LexicalNode>,
  transforms: Set<Transform<LexicalNode>>,
};
export type Transform<T> = (node: T) => void;

export type ErrorHandler = (error: Error) => void;
export type MutationListeners = Map<MutationListener, Class<LexicalNode>>;
export type MutatedNodes = Map<Class<LexicalNode>, Map<NodeKey, NodeMutation>>;
export type NodeMutation = 'created' | 'destroyed';

export type UpdateListener = ({
  dirtyElements: Map<NodeKey, IntentionallyMarkedAsDirtyElement>,
  dirtyLeaves: Set<NodeKey>,
  editorState: EditorState,
  normalizedNodes: Set<NodeKey>,
  prevEditorState: EditorState,
  tags: Set<string>,
}) => void;
export type DecoratorListener = (decorator: {[NodeKey]: ReactNode}) => void;
export type RootListener = (
  rootElement: null | HTMLElement,
  prevRootElement: null | HTMLElement,
) => void;
export type TextContentListener = (text: string) => void;
export type MutationListener = (nodes: Map<NodeKey, NodeMutation>) => void;
export type CommandListener = (
  type: string,
  payload: CommandPayload,
  editor: LexicalEditor,
) => boolean;
export type ReadOnlyListener = (isReadOnly: boolean) => void;

export type CommandListenerEditorPriority = 0;
export type CommandListenerLowPriority = 1;
export type CommandListenerNormalPriority = 2;
export type CommandListenerHighPriority = 3;
export type CommandListenerCriticalPriority = 4;

export type CommandListenerPriority =
  | CommandListenerEditorPriority
  | CommandListenerLowPriority
  | CommandListenerNormalPriority
  | CommandListenerHighPriority
  | CommandListenerCriticalPriority;

// $FlowFixMe: intentional
export type CommandPayload = any;

type Listeners = {
  command: Array<Set<CommandListener>>,
  decorator: Set<DecoratorListener>,
  mutation: MutationListeners,
  readonly: Set<ReadOnlyListener>,
  root: Set<RootListener>,
  textcontent: Set<TextContentListener>,
  update: Set<UpdateListener>,
};

export type ListenerType =
  | 'update'
  | 'root'
  | 'decorator'
  | 'textcontent'
  | 'mutation'
  | 'command';

export type TransformerType = 'text' | 'decorator' | 'element' | 'root';

export type IntentionallyMarkedAsDirtyElement = boolean;

type DOMConversionCache = Map<
  string,
  Array<(node: Node) => DOMConversion | null>,
>;

export function resetEditor(
  editor: LexicalEditor,
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
  editor._dirtyElements.clear();
  editor._normalizedNodes = new Set();
  editor._updateTags = new Set();
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

function initializeConversionCache(nodes: RegisteredNodes): DOMConversionCache {
  const conversionCache = new Map();
  const handledConversions = new Set();
  nodes.forEach((node) => {
    const convertDOM = node.klass.convertDOM;
    if (handledConversions.has(convertDOM)) {
      return;
    }
    handledConversions.add(convertDOM);
    const map = convertDOM();
    if (map !== null) {
      Object.keys(map).forEach((key) => {
        let currentCache = conversionCache.get(key);
        if (currentCache === undefined) {
          currentCache = [];
          conversionCache.set(key, currentCache);
        }
        currentCache.push(map[key]);
      });
    }
  });
  return conversionCache;
}

export function createEditor<EditorContext>(editorConfig?: {
  context?: EditorContext,
  disableEvents?: boolean,
  editorState?: EditorState,
  namespace?: string,
  nodes?: Array<Class<LexicalNode>>,
  onError?: ErrorHandler,
  parentEditor?: LexicalEditor,
  theme?: EditorThemeClasses,
}): LexicalEditor {
  const config = editorConfig || {};
  const namespace = config.namespace || createUID();
  const theme = config.theme || {};
  const context = config.context || {};
  const parentEditor = config.parentEditor || null;
  const disableEvents = config.disableEvents || false;
  const editorState = createEmptyEditorState();
  const initialEditorState = config.editorState;
  const nodes = [
    RootNode,
    TextNode,
    LineBreakNode,
    ParagraphNode,
    ...(config.nodes || []),
  ];

  const defaultOnError = (e: Error, log) => {
    throw e;
  };
  const onError = config.onError || defaultOnError;

  const registeredNodes = new Map();
  for (let i = 0; i < nodes.length; i++) {
    const klass = nodes[i];
    const type = klass.getType();
    registeredNodes.set(type, {
      klass,
      transforms: new Set(),
    });
  }
  // klass: Array<Class<LexicalNode>>
  // $FlowFixMe: use our declared type instead
  const editor: editor = new BaseLexicalEditor(
    editorState,
    parentEditor,
    registeredNodes,
    {
      // $FlowFixMe: we use our internal type to simpify the generics
      context,
      disableEvents,
      namespace,
      theme,
    },
    onError,
    initializeConversionCache(registeredNodes),
  );
  if (initialEditorState !== undefined) {
    editor._pendingEditorState = initialEditorState;
    editor._dirtyType = FULL_RECONCILE;
  }
  return editor;
}

function getSelf(self: BaseLexicalEditor): LexicalEditor {
  // $FlowFixMe: a hack to work around exporting a declaration
  return ((self: any): LexicalEditor);
}

class BaseLexicalEditor {
  _parentEditor: null | LexicalEditor;
  _rootElement: null | HTMLElement;
  _editorState: EditorState;
  _pendingEditorState: null | EditorState;
  _compositionKey: null | NodeKey;
  _deferred: Array<() => void>;
  _keyToDOMMap: Map<NodeKey, HTMLElement>;
  _updates: Array<[() => void, void | EditorUpdateOptions]>;
  _updating: boolean;
  _listeners: Listeners;
  _nodes: RegisteredNodes;
  _decorators: {[NodeKey]: ReactNode};
  _pendingDecorators: null | {[NodeKey]: ReactNode};
  _config: EditorConfig<{...}>;
  _dirtyType: 0 | 1 | 2;
  _cloneNotNeeded: Set<NodeKey>;
  _dirtyLeaves: Set<NodeKey>;
  _dirtyElements: Map<NodeKey, IntentionallyMarkedAsDirtyElement>;
  _normalizedNodes: Set<NodeKey>;
  _updateTags: Set<string>;
  _observer: null | MutationObserver;
  _key: string;
  _onError: ErrorHandler;
  _htmlConversions: DOMConversionCache;
  _readOnly: boolean;

  constructor(
    editorState: EditorState,
    parentEditor: null | LexicalEditor,
    nodes: RegisteredNodes,
    config: EditorConfig<{...}>,
    onError: ErrorHandler,
    htmlConversions: DOMConversionCache,
  ) {
    this._parentEditor = parentEditor;
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
      command: [new Set(), new Set(), new Set(), new Set(), new Set()],
      decorator: new Set(),
      mutation: new Map(),
      readonly: new Set(),
      root: new Set(),
      textcontent: new Set(),
      update: new Set(),
    };
    // Editor configuration for theme/context.
    this._config = config;
    // Mapping of types to their nodes
    this._nodes = nodes;
    // React node decorators for portals
    this._decorators = {};
    this._pendingDecorators = null;
    // Used to optimize reconcilation
    this._dirtyType = NO_DIRTY_NODES;
    this._cloneNotNeeded = new Set();
    this._dirtyLeaves = new Set();
    this._dirtyElements = new Map();
    this._normalizedNodes = new Set();
    this._updateTags = new Set();
    // Handling of DOM mutations
    this._observer = null;
    // Used for identifying owning editors
    this._key = generateRandomKey();
    this._onError = onError;
    this._htmlConversions = htmlConversions;
    this._readOnly = false;
  }
  isComposing(): boolean {
    return this._compositionKey != null;
  }
  addListener(
    type: ListenerType,
    arg1:
      | UpdateListener
      | DecoratorListener
      | RootListener
      | TextContentListener
      | CommandListener
      | ReadOnlyListener
      | Class<LexicalNode>,
    arg2: MutationListener | CommandListenerPriority,
  ): () => void {
    const listenerSetOrMap = this._listeners[type];
    if (type === 'command') {
      // $FlowFixMe: TODO refine
      const listener: CommandListener = arg1;
      // $FlowFixMe: TODO refine
      const priority = (arg2: CommandListenerPriority);
      if (priority === undefined) {
        invariant(false, 'Listener for type "command" requires a "priority".');
      }

      // $FlowFixMe: unsure how to cast this
      const commands: Array<Set<CommandListener>> = listenerSetOrMap;
      const commandSet = commands[priority];
      commandSet.add(listener);
      return () => {
        commandSet.delete(listener);
      };
    } else if (type === 'mutation') {
      // $FlowFixMe: refine
      const klass = (arg1: Class<LexicalNode>);
      // $FlowFixMe: refine
      const mutationListener = (arg2: MutationListener);
      const registeredNode = this._nodes.get(klass.getType());
      if (registeredNode === undefined) {
        invariant(
          false,
          'Node %s has not been registered. Ensure node has been passed to createEditor.',
          klass.name,
        );
      }
      const mutations = this._listeners.mutation;
      mutations.set(mutationListener, klass);
      return () => {
        mutations.delete(mutationListener);
      };
    } else {
      const listener:
        | UpdateListener
        | DecoratorListener
        | RootListener
        | TextContentListener
        | ReadOnlyListener
        // $FlowFixMe: TODO refine
        | CommandListener = arg1;
      // $FlowFixMe: TODO refine this from the above types
      listenerSetOrMap.add(listener);

      const isRootType = type === 'root';
      if (isRootType) {
        // $FlowFixMe: TODO refine
        const rootListener: RootListener = listener;
        rootListener(this._rootElement, null);
      }
      return () => {
        // $FlowFixMe: TODO refine this from the above types
        listenerSetOrMap.delete(listener);
        if (isRootType) {
          // $FlowFixMe: TODO refine
          const rootListener: RootListener = (listener: any);
          rootListener(null, this._rootElement);
        }
      };
    }
  }
  addTransform(
    // There's no Flow-safe way to preserve the T in Transform<T>, but <T: LexicalNode> in the
    // declaration below guarantees these are LexicalNodes.
    klass: Class<LexicalNode>,
    listener: Transform<LexicalNode>,
  ): () => void {
    const type = klass.getType();
    const registeredNode = this._nodes.get(type);
    if (registeredNode === undefined) {
      invariant(
        false,
        'Node %s has not been registered. Ensure node has been passed to createEditor.',
        klass.name,
      );
    }
    const transforms = registeredNode.transforms;
    transforms.add(listener);
    markAllNodesAsDirty(getSelf(this), type);
    return () => {
      transforms.delete(listener);
    };
  }
  hasNodes(nodes: Array<Class<LexicalNode>>): boolean {
    for (let i = 0; i < nodes.length; i++) {
      const klass = nodes[i];
      const type = klass.getType();
      if (!this._nodes.has(type)) {
        return false;
      }
    }
    return true;
  }
  execCommand(type: string, payload?: CommandPayload): boolean {
    return triggerCommandListeners(getSelf(this), type, payload);
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
        // TODO: remove this flag once we no longer use UEv2 internally
        if (!this._config.disableEvents) {
          removeRootElementEvents(prevRootElement);
        }
      }
      if (nextRootElement !== null) {
        const style = nextRootElement.style;
        style.userSelect = 'text';
        style.whiteSpace = 'pre-wrap';
        style.overflowWrap = 'break-word';
        nextRootElement.setAttribute('data-lexical-editor', 'true');
        this._dirtyType = FULL_RECONCILE;
        initMutationObserver(getSelf(this));
        this._updateTags.add('history-merge');
        commitPendingUpdates(getSelf(this));
        // TODO: remove this flag once we no longer use UEv2 internally
        if (!this._config.disableEvents) {
          addRootElementEvents(nextRootElement, getSelf(this));
        }
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
  setEditorState(editorState: EditorState, options?: EditorSetOptions): void {
    if (editorState.isEmpty()) {
      invariant(
        false,
        "setEditorState: the editor state is empty. Ensure the editor state's root node never becomes empty.",
      );
    }
    flushRootMutations(getSelf(this));
    const pendingEditorState = this._pendingEditorState;
    const tags = getSelf(this)._updateTags;
    const tag = options !== undefined ? options.tag : null;
    if (pendingEditorState !== null && !pendingEditorState.isEmpty()) {
      if (tag != null) {
        tags.add(tag);
      }
      commitPendingUpdates(getSelf(this));
    }
    this._pendingEditorState = editorState;
    this._dirtyType = FULL_RECONCILE;
    this._compositionKey = null;
    if (tag != null) {
      tags.add(tag);
    }
    commitPendingUpdates(getSelf(this));
  }
  parseEditorState(stringifiedEditorState: string): EditorState {
    return parseEditorState(stringifiedEditorState, getSelf(this));
  }
  update(updateFn: () => void, options?: EditorUpdateOptions): void {
    updateEditor(getSelf(this), updateFn, options);
  }
  focus(callbackFn?: () => void): void {
    const rootElement = this._rootElement;
    if (rootElement !== null) {
      // This ensures that iOS does not trigger caps lock upon focus
      rootElement.setAttribute('autocapitalize', 'off');
      updateEditor(
        getSelf(this),
        () => {
          const selection = $getSelection();
          const root = $getRoot();
          if (selection !== null) {
            // Marking the selection dirty will force the selection back to it
            selection.dirty = true;
          } else if (root.getChildrenSize() !== 0) {
            root.selectEnd();
          }
        },
        {
          onUpdate: () => {
            rootElement.removeAttribute('autocapitalize');
            if (callbackFn) {
              callbackFn();
            }
          },
        },
      );
    }
  }
  blur(): void {
    const rootElement = this._rootElement;
    if (rootElement !== null) {
      rootElement.blur();
    }
    const domSelection = window.getSelection();
    if (domSelection !== null) {
      domSelection.removeAllRanges();
    }
  }
  isReadOnly(): boolean {
    return this._readOnly;
  }
  setReadOnly(isReadOnly: boolean): void {
    this._readOnly = isReadOnly;
    triggerListeners('readonly', getSelf(this), true, isReadOnly);
  }
}

// We export this to make the addListener types work properly.
// For some reason, we can't do this via an interface without
// Flow messing up the types. It's hacky, but it improves DX.
declare export class LexicalEditor {
  _cloneNotNeeded: Set<NodeKey>;
  _compositionKey: null | NodeKey;
  _config: EditorConfig<{...}>;
  _decorators: {[NodeKey]: ReactNode};
  _deferred: Array<() => void>;
  _dirtyElements: Map<NodeKey, IntentionallyMarkedAsDirtyElement>;
  _dirtyLeaves: Set<NodeKey>;
  _dirtyType: 0 | 1 | 2;
  _editorState: EditorState;
  _htmlConversions: DOMConversionCache;
  _key: string;
  _keyToDOMMap: Map<NodeKey, HTMLElement>;
  _listeners: Listeners;
  _nodes: RegisteredNodes;
  _normalizedNodes: Set<NodeKey>;
  _observer: null | MutationObserver;
  _onError: ErrorHandler;
  _parentEditor: null | LexicalEditor;
  _pendingDecorators: null | {[NodeKey]: ReactNode};
  _pendingEditorState: null | EditorState;
  _readOnly: boolean;
  _rootElement: null | HTMLElement;
  _updates: Array<[() => void, void | EditorUpdateOptions]>;
  _updateTags: Set<string>;
  _updating: boolean;

  addListener(type: 'update', listener: UpdateListener): () => void;
  addListener(type: 'root', listener: RootListener): () => void;
  addListener(type: 'decorator', listener: DecoratorListener): () => void;
  addListener(type: 'textcontent', listener: TextContentListener): () => void;
  addListener(
    type: 'mutation',
    klass: Class<LexicalNode>,
    listener: MutationListener,
  ): () => void;
  addListener(
    type: 'command',
    listener: CommandListener,
    priority: CommandListenerPriority,
  ): () => void;
  addTransform<T: LexicalNode>(
    klass: Class<T>,
    listener: Transform<T>,
  ): () => void;
  blur(): void;
  execCommand(type: string, payload: CommandPayload): boolean;
  focus(callbackFn?: () => void): void;
  getDecorators(): {[NodeKey]: ReactNode};
  getEditorState(): EditorState;
  getElementByKey(key: NodeKey): null | HTMLElement;
  getRootElement(): null | HTMLElement;
  hasNodes(nodes: Array<Class<LexicalNode>>): boolean;
  isComposing(): boolean;
  isReadOnly(): boolean;
  parseEditorState(stringifiedEditorState: string): EditorState;
  setEditorState(editorState: EditorState, options?: EditorSetOptions): void;
  setReadOnly(isReadOnly: boolean): void;
  setRootElement(rootElement: null | HTMLElement): void;
  update(updateFn: () => void, options?: EditorUpdateOptions): boolean;
}
