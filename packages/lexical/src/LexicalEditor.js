/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  EditorState,
  ParsedEditorState,
  SerializedEditorState,
} from './LexicalEditorState';
import type {DOMConversion, LexicalNode, NodeKey} from './LexicalNode';

import getDOMSelection from 'shared/getDOMSelection';
import invariant from 'shared/invariant';

import {$getRoot, $getSelection, TextNode} from '.';
import {FULL_RECONCILE, NO_DIRTY_NODES} from './LexicalConstants';
import {createEmptyEditorState} from './LexicalEditorState';
import {addRootElementEvents, removeRootElementEvents} from './LexicalEvents';
import {flushRootMutations, initMutationObserver} from './LexicalMutations';
import {
  commitPendingUpdates,
  parseEditorState,
  triggerListeners,
  unstable_parseEditorState,
  updateEditor,
} from './LexicalUpdates';
import {
  createUID,
  dispatchCommand,
  generateRandomKey,
  markAllNodesAsDirty,
} from './LexicalUtils';
import {LineBreakNode} from './nodes/LexicalLineBreakNode';
import {ParagraphNode} from './nodes/LexicalParagraphNode';
import {RootNode} from './nodes/LexicalRootNode';

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
    olDepth?: Array<EditorThemeClassName>,
    ul?: EditorThemeClassName,
    ulDepth: Array<EditorThemeClassName>,
  },
  ltr?: EditorThemeClassName,
  mark?: EditorThemeClassName,
  markOverlap?: EditorThemeClassName,
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

export type EditorConfig = {
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
export type NodeMutation = 'created' | 'updated' | 'destroyed';

export type UpdateListener = ({
  dirtyElements: Map<NodeKey, IntentionallyMarkedAsDirtyElement>,
  dirtyLeaves: Set<NodeKey>,
  editorState: EditorState,
  normalizedNodes: Set<NodeKey>,
  prevEditorState: EditorState,
  tags: Set<string>,
}) => void;
export type DecoratorListener = (decorator: {[NodeKey]: mixed}) => void;
export type RootListener = (
  rootElement: null | HTMLElement,
  prevRootElement: null | HTMLElement,
) => void;
export type TextContentListener = (text: string) => void;
export type MutationListener = (nodes: Map<NodeKey, NodeMutation>) => void;
export type CommandListener<P> = (payload: P, editor: LexicalEditor) => boolean;
export type ReadOnlyListener = (readOnly: boolean) => void;

export type CommandListenerPriority = 0 | 1 | 2 | 3 | 4;
export const COMMAND_PRIORITY_EDITOR = 0;
export const COMMAND_PRIORITY_LOW = 1;
export const COMMAND_PRIORITY_NORMAL = 2;
export const COMMAND_PRIORITY_HIGH = 3;
export const COMMAND_PRIORITY_CRITICAL = 4;

// eslint-disable-next-line no-unused-vars
export type LexicalCommand<T> = $ReadOnly<{}>;

// $FlowFixMe[unclear-type]
type Commands = Map<LexicalCommand<any>, Array<Set<CommandListener<any>>>>;

type Listeners = {
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
  | 'readonly';

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
    const importDOM = node.klass.importDOM;
    if (handledConversions.has(importDOM)) {
      return;
    }
    handledConversions.add(importDOM);
    const map = importDOM();
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

export function createEditor(editorConfig?: {
  disableEvents?: boolean,
  editorState?: EditorState,
  namespace?: string,
  nodes?: $ReadOnlyArray<Class<LexicalNode>>,
  onError: ErrorHandler,
  parentEditor?: LexicalEditor,
  readOnly?: boolean,
  theme?: EditorThemeClasses,
}): LexicalEditor {
  const config = editorConfig || {};
  const namespace = config.namespace || createUID();
  const theme = config.theme || {};
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
  const onError = config.onError;
  const isReadOnly = config.readOnly || false;

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
  const editor: editor = new LexicalEditor(
    editorState,
    parentEditor,
    registeredNodes,
    {
      disableEvents,
      namespace,
      theme,
    },
    onError,
    initializeConversionCache(registeredNodes),
    isReadOnly,
  );
  if (initialEditorState !== undefined) {
    editor._pendingEditorState = initialEditorState;
    editor._dirtyType = FULL_RECONCILE;
  }
  return editor;
}

export class LexicalEditor {
  _headless: boolean;
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
  _commands: Commands;
  _nodes: RegisteredNodes;
  _decorators: {[NodeKey]: mixed};
  _pendingDecorators: null | {[NodeKey]: mixed};
  _config: EditorConfig;
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
    config: EditorConfig,
    onError: ErrorHandler,
    htmlConversions: DOMConversionCache,
    readOnly: boolean,
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
      decorator: new Set(),
      mutation: new Map(),
      readonly: new Set(),
      root: new Set(),
      textcontent: new Set(),
      update: new Set(),
    };
    // Commands
    this._commands = new Map();
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
    this._headless = false;
  }
  isComposing(): boolean {
    return this._compositionKey != null;
  }
  registerUpdateListener(listener: UpdateListener): () => void {
    const listenerSetOrMap = this._listeners.update;
    listenerSetOrMap.add(listener);
    return () => {
      listenerSetOrMap.delete(listener);
    };
  }
  registerReadOnlyListener(listener: ReadOnlyListener): () => void {
    const listenerSetOrMap = this._listeners.readonly;
    listenerSetOrMap.add(listener);
    return () => {
      listenerSetOrMap.delete(listener);
    };
  }
  registerDecoratorListener(listener: DecoratorListener): () => void {
    const listenerSetOrMap = this._listeners.decorator;
    listenerSetOrMap.add(listener);
    return () => {
      listenerSetOrMap.delete(listener);
    };
  }
  registerTextContentListener(listener: TextContentListener): () => void {
    const listenerSetOrMap = this._listeners.textcontent;
    listenerSetOrMap.add(listener);
    return () => {
      listenerSetOrMap.delete(listener);
    };
  }
  registerRootListener(listener: RootListener): () => void {
    const listenerSetOrMap = this._listeners.root;
    listener(this._rootElement, null);
    listenerSetOrMap.add(listener);
    return () => {
      listener(null, this._rootElement);
      listenerSetOrMap.delete(listener);
    };
  }
  registerCommand<P>(
    command: LexicalCommand<P>,
    listener: CommandListener<P>,
    priority: CommandListenerPriority,
  ): () => void {
    if (priority === undefined) {
      invariant(false, 'Listener for type "command" requires a "priority".');
    }
    const commandsMap = this._commands;
    if (!commandsMap.has(command)) {
      commandsMap.set(command, [
        new Set(),
        new Set(),
        new Set(),
        new Set(),
        new Set(),
      ]);
    }
    const listenersInPriorityOrder = commandsMap.get(command);
    if (listenersInPriorityOrder === undefined) {
      invariant(
        false,
        'registerCommand: Command %s not found in command map',
        command,
      );
    }
    const listeners = listenersInPriorityOrder[priority];
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (
        listenersInPriorityOrder.every(
          (listenersSet) => listenersSet.size === 0,
        )
      ) {
        commandsMap.delete(command);
      }
    };
  }
  registerMutationListener(
    klass: Class<LexicalNode>,
    listener: MutationListener,
  ): () => void {
    const registeredNode = this._nodes.get(klass.getType());
    if (registeredNode === undefined) {
      invariant(
        false,
        'Node %s has not been registered. Ensure node has been passed to createEditor.',
        klass.name,
      );
    }
    const mutations = this._listeners.mutation;
    mutations.set(listener, klass);
    return () => {
      mutations.delete(listener);
    };
  }
  registerNodeTransform(
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
    markAllNodesAsDirty(this, type);
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
  dispatchCommand<P>(type: LexicalCommand<P>, payload: P): boolean {
    return dispatchCommand(this, type, payload);
  }
  getDecorators(): {[NodeKey]: mixed} {
    return this._decorators;
  }
  getRootElement(): null | HTMLElement {
    return this._rootElement;
  }
  getKey(): string {
    return this._key;
  }
  setRootElement(nextRootElement: null | HTMLElement): void {
    const prevRootElement = this._rootElement;
    if (nextRootElement !== prevRootElement) {
      const pendingEditorState = this._pendingEditorState || this._editorState;
      this._rootElement = nextRootElement;

      resetEditor(this, prevRootElement, nextRootElement, pendingEditorState);
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
        style.wordBreak = 'break-word';
        nextRootElement.setAttribute('data-lexical-editor', 'true');
        this._dirtyType = FULL_RECONCILE;
        initMutationObserver(this);
        this._updateTags.add('history-merge');
        commitPendingUpdates(this);
        // TODO: remove this flag once we no longer use UEv2 internally
        if (!this._config.disableEvents) {
          addRootElementEvents(nextRootElement, this);
        }
      }
      triggerListeners('root', this, false, nextRootElement, prevRootElement);
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
    flushRootMutations(this);
    const pendingEditorState = this._pendingEditorState;
    const tags = this._updateTags;
    const tag = options !== undefined ? options.tag : null;
    if (pendingEditorState !== null && !pendingEditorState.isEmpty()) {
      if (tag != null) {
        tags.add(tag);
      }
      commitPendingUpdates(this);
    }
    this._pendingEditorState = editorState;
    this._dirtyType = FULL_RECONCILE;
    this._compositionKey = null;
    if (tag != null) {
      tags.add(tag);
    }
    commitPendingUpdates(this);
  }
  // TODO: once unstable_parseEditorState is stable, swap that for this.
  parseEditorState(
    maybeStringifiedEditorState: string | ParsedEditorState,
  ): EditorState {
    const parsedEditorState =
      typeof maybeStringifiedEditorState === 'string'
        ? JSON.parse(maybeStringifiedEditorState)
        : maybeStringifiedEditorState;
    return parseEditorState(parsedEditorState, this);
  }
  unstable_parseEditorState<SerializedNode>(
    maybeStringifiedEditorState: string | SerializedEditorState<SerializedNode>,
    updateFn?: () => void,
  ): EditorState {
    const serializedEditorState =
      typeof maybeStringifiedEditorState === 'string'
        ? JSON.parse(maybeStringifiedEditorState)
        : maybeStringifiedEditorState;
    return unstable_parseEditorState(serializedEditorState, this, updateFn);
  }
  update(updateFn: () => void, options?: EditorUpdateOptions): void {
    updateEditor(this, updateFn, options);
  }
  focus(callbackFn?: () => void): void {
    const rootElement = this._rootElement;
    if (rootElement !== null) {
      // This ensures that iOS does not trigger caps lock upon focus
      rootElement.setAttribute('autocapitalize', 'off');
      updateEditor(
        this,
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
    const domSelection = getDOMSelection();
    if (domSelection !== null) {
      domSelection.removeAllRanges();
    }
  }
  isReadOnly(): boolean {
    return this._readOnly;
  }
  setReadOnly(readOnly: boolean): void {
    this._readOnly = readOnly;
    triggerListeners('readonly', this, true, readOnly);
  }
  toJSON(): {editorState: EditorState} {
    return {
      editorState: this._editorState,
    };
  }
}
