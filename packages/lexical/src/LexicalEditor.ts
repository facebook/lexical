/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {EditorState, SerializedEditorState} from './LexicalEditorState';
import type {DOMConversion, NodeKey} from './LexicalNode';

import getDOMSelection from 'shared/getDOMSelection';
import invariant from 'shared/invariant';

import {$getRoot, $getSelection, TextNode} from '.';
import {FULL_RECONCILE, NO_DIRTY_NODES} from './LexicalConstants';
import {createEmptyEditorState} from './LexicalEditorState';
import {addRootElementEvents, removeRootElementEvents} from './LexicalEvents';
import {flushRootMutations, initMutationObserver} from './LexicalMutations';
import {LexicalNode} from './LexicalNode';
import {
  commitPendingUpdates,
  internalGetActiveEditor,
  parseEditorState,
  triggerListeners,
  updateEditor,
} from './LexicalUpdates';
import {
  createUID,
  dispatchCommand,
  getCachedClassNameArray,
  getDefaultView,
  markAllNodesAsDirty,
} from './LexicalUtils';
import {DecoratorNode} from './nodes/LexicalDecoratorNode';
import {LineBreakNode} from './nodes/LexicalLineBreakNode';
import {ParagraphNode} from './nodes/LexicalParagraphNode';
import {RootNode} from './nodes/LexicalRootNode';

export type Spread<T1, T2> = Omit<T2, keyof T1> & T1;

export type Klass<T extends LexicalNode> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new (...args: any[]): T;
} & Omit<LexicalNode, 'constructor'>;

export type EditorThemeClassName = string;

export type TextNodeThemeClasses = {
  base?: EditorThemeClassName;
  bold?: EditorThemeClassName;
  code?: EditorThemeClassName;
  italic?: EditorThemeClassName;
  strikethrough?: EditorThemeClassName;
  subscript?: EditorThemeClassName;
  superscript?: EditorThemeClassName;
  underline?: EditorThemeClassName;
  underlineStrikethrough?: EditorThemeClassName;
};

export type EditorUpdateOptions = {
  onUpdate?: () => void;
  skipTransforms?: true;
  tag?: string;
  discrete?: true;
};

export type EditorSetOptions = {
  tag?: string;
};

export type EditorFocusOptions = {
  defaultSelection?: 'rootStart' | 'rootEnd';
};

export type EditorThemeClasses = {
  characterLimit?: EditorThemeClassName;
  code?: EditorThemeClassName;
  codeHighlight?: Record<string, EditorThemeClassName>;
  hashtag?: EditorThemeClassName;
  heading?: {
    h1?: EditorThemeClassName;
    h2?: EditorThemeClassName;
    h3?: EditorThemeClassName;
    h4?: EditorThemeClassName;
    h5?: EditorThemeClassName;
    h6?: EditorThemeClassName;
  };
  image?: EditorThemeClassName;
  link?: EditorThemeClassName;
  list?: {
    ul?: EditorThemeClassName;
    ulDepth?: Array<EditorThemeClassName>;
    ol?: EditorThemeClassName;
    olDepth?: Array<EditorThemeClassName>;
    listitem?: EditorThemeClassName;
    listitemChecked?: EditorThemeClassName;
    listitemUnchecked?: EditorThemeClassName;
    nested?: {
      list?: EditorThemeClassName;
      listitem?: EditorThemeClassName;
    };
  };
  ltr?: EditorThemeClassName;
  mark?: EditorThemeClassName;
  markOverlap?: EditorThemeClassName;
  paragraph?: EditorThemeClassName;
  quote?: EditorThemeClassName;
  root?: EditorThemeClassName;
  rtl?: EditorThemeClassName;
  table?: EditorThemeClassName;
  tableAddColumns?: EditorThemeClassName;
  tableAddRows?: EditorThemeClassName;
  tableCellActionButton?: EditorThemeClassName;
  tableCellActionButtonContainer?: EditorThemeClassName;
  tableCellPrimarySelected?: EditorThemeClassName;
  tableCellSelected?: EditorThemeClassName;
  tableCell?: EditorThemeClassName;
  tableCellEditing?: EditorThemeClassName;
  tableCellHeader?: EditorThemeClassName;
  tableCellResizer?: EditorThemeClassName;
  tableCellSortedIndicator?: EditorThemeClassName;
  tableResizeRuler?: EditorThemeClassName;
  tableRow?: EditorThemeClassName;
  tableSelected?: EditorThemeClassName;
  text?: TextNodeThemeClasses;
  embedBlock?: {
    base?: EditorThemeClassName;
    focus?: EditorThemeClassName;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

export type EditorConfig = {
  disableEvents?: boolean;
  namespace: string;
  theme: EditorThemeClasses;
};

export type RegisteredNodes = Map<string, RegisteredNode>;

export type RegisteredNode = {
  klass: Klass<LexicalNode>;
  transforms: Set<Transform<LexicalNode>>;
  replace: null | ((node: LexicalNode) => LexicalNode);
};

export type Transform<T extends LexicalNode> = (node: T) => void;

export type ErrorHandler = (error: Error) => void;

export type MutationListeners = Map<MutationListener, Klass<LexicalNode>>;

export type MutatedNodes = Map<Klass<LexicalNode>, Map<NodeKey, NodeMutation>>;

export type NodeMutation = 'created' | 'updated' | 'destroyed';

export type UpdateListener = (arg0: {
  dirtyElements: Map<NodeKey, IntentionallyMarkedAsDirtyElement>;
  dirtyLeaves: Set<NodeKey>;
  editorState: EditorState;
  normalizedNodes: Set<NodeKey>;
  prevEditorState: EditorState;
  tags: Set<string>;
}) => void;

export type DecoratorListener<T = never> = (
  decorator: Record<NodeKey, T>,
) => void;

export type RootListener = (
  rootElement: null | HTMLElement,
  prevRootElement: null | HTMLElement,
) => void;

export type TextContentListener = (text: string) => void;

export type MutationListener = (
  nodes: Map<NodeKey, NodeMutation>,
  payload: {updateTags: Set<string>; dirtyLeaves: Set<string>},
) => void;

export type CommandListener<P> = (payload: P, editor: LexicalEditor) => boolean;

export type EditableListener = (editable: boolean) => void;

export type CommandListenerPriority = 0 | 1 | 2 | 3 | 4;

export const COMMAND_PRIORITY_EDITOR = 0;
export const COMMAND_PRIORITY_LOW = 1;
export const COMMAND_PRIORITY_NORMAL = 2;
export const COMMAND_PRIORITY_HIGH = 3;
export const COMMAND_PRIORITY_CRITICAL = 4;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type LexicalCommand<TPayload> = {
  type?: string;
};

/**
 * Type helper for extracting the payload type from a command.
 *
 * @example
 * ```ts
 * const MY_COMMAND = createCommand<SomeType>();
 *
 * // ...
 *
 * editor.registerCommand(MY_COMMAND, payload => {
 *   // Type of `payload` is inferred here. But lets say we want to extract a function to delegate to
 *   handleMyCommand(editor, payload);
 *   return true;
 * });
 *
 * function handleMyCommand(editor: LexicalEditor, payload: CommandPayloadType<typeof MY_COMMAND>) {
 *   // `payload` is of type `SomeType`, extracted from the command.
 * }
 * ```
 */
export type CommandPayloadType<TCommand extends LexicalCommand<unknown>> =
  TCommand extends LexicalCommand<infer TPayload> ? TPayload : never;

type Commands = Map<
  LexicalCommand<unknown>,
  Array<Set<CommandListener<unknown>>>
>;
type Listeners = {
  decorator: Set<DecoratorListener>;
  mutation: MutationListeners;
  editable: Set<EditableListener>;
  root: Set<RootListener>;
  textcontent: Set<TextContentListener>;
  update: Set<UpdateListener>;
};

export type Listener =
  | DecoratorListener
  | EditableListener
  | MutationListener
  | RootListener
  | TextContentListener
  | UpdateListener;

export type ListenerType =
  | 'update'
  | 'root'
  | 'decorator'
  | 'textcontent'
  | 'mutation'
  | 'editable';

export type TransformerType = 'text' | 'decorator' | 'element' | 'root';

export type IntentionallyMarkedAsDirtyElement = boolean;
type DOMConversionCache = Map<
  string,
  Array<(node: Node) => DOMConversion | null>
>;

export type SerializedEditor = {
  editorState: SerializedEditorState;
};

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
    const importDOM =
      node.klass.importDOM != null
        ? node.klass.importDOM.bind(node.klass)
        : null;

    if (importDOM == null || handledConversions.has(importDOM)) {
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
  disableEvents?: boolean;
  editorState?: EditorState;
  namespace?: string;
  nodes?: ReadonlyArray<
    | Klass<LexicalNode>
    | {
        replace: Klass<LexicalNode>;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        with: <T extends {new (...args: any): any}>(
          node: InstanceType<T>,
        ) => LexicalNode;
      }
  >;
  onError?: ErrorHandler;
  parentEditor?: LexicalEditor;
  editable?: boolean;
  theme?: EditorThemeClasses;
}): LexicalEditor {
  const config = editorConfig || {};
  const activeEditor = internalGetActiveEditor();
  const theme = config.theme || {};
  const parentEditor =
    editorConfig === undefined ? activeEditor : config.parentEditor || null;
  const disableEvents = config.disableEvents || false;
  const editorState = createEmptyEditorState();
  const namespace =
    config.namespace ||
    (parentEditor !== null ? parentEditor._config.namespace : createUID());
  const initialEditorState = config.editorState;
  const nodes = [
    RootNode,
    TextNode,
    LineBreakNode,
    ParagraphNode,
    ...(config.nodes || []),
  ];
  const onError = config.onError;
  const isEditable = config.editable !== undefined ? config.editable : true;
  let registeredNodes;

  if (editorConfig === undefined && activeEditor !== null) {
    registeredNodes = activeEditor._nodes;
  } else {
    registeredNodes = new Map();
    for (let i = 0; i < nodes.length; i++) {
      let klass = nodes[i];
      let replacementClass = null;

      if (typeof klass !== 'function') {
        const options = klass;
        klass = options.replace;
        replacementClass = options.with;
      }
      // Ensure custom nodes implement required methods.
      if (__DEV__) {
        const name = klass.name;
        if (name !== 'RootNode') {
          const proto = klass.prototype;
          ['getType', 'clone'].forEach((method) => {
            // eslint-disable-next-line no-prototype-builtins
            if (!klass.hasOwnProperty(method)) {
              console.warn(`${name} must implement static "${method}" method`);
            }
          });
          if (
            // eslint-disable-next-line no-prototype-builtins
            !klass.hasOwnProperty('importDOM') &&
            // eslint-disable-next-line no-prototype-builtins
            klass.hasOwnProperty('exportDOM')
          ) {
            console.warn(
              `${name} should implement "importDOM" if using a custom "exportDOM" method to ensure HTML serialization (important for copy & paste) works as expected`,
            );
          }
          if (proto instanceof DecoratorNode) {
            // eslint-disable-next-line no-prototype-builtins
            if (!proto.hasOwnProperty('decorate')) {
              console.warn(
                `${proto.constructor.name} must implement "decorate" method`,
              );
            }
          }
          if (
            // eslint-disable-next-line no-prototype-builtins
            !klass.hasOwnProperty('importJSON')
          ) {
            console.warn(
              `${name} should implement "importJSON" method to ensure JSON and default HTML serialization works as expected`,
            );
          }
          if (
            // eslint-disable-next-line no-prototype-builtins
            !proto.hasOwnProperty('exportJSON')
          ) {
            console.warn(
              `${name} should implement "exportJSON" method to ensure JSON and default HTML serialization works as expected`,
            );
          }
        }
      }
      const type = klass.getType();
      registeredNodes.set(type, {
        klass,
        replace: replacementClass,
        transforms: new Set(),
      });
    }
  }

  const editor = new LexicalEditor(
    editorState,
    parentEditor,
    registeredNodes,
    {
      disableEvents,
      namespace,
      theme,
    },
    onError ? onError : console.error,
    initializeConversionCache(registeredNodes),
    isEditable,
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
  _updates: Array<[() => void, EditorUpdateOptions | undefined]>;
  _updating: boolean;
  _listeners: Listeners;
  _commands: Commands;
  _nodes: RegisteredNodes;
  _decorators: Record<NodeKey, unknown>;
  _pendingDecorators: null | Record<NodeKey, unknown>;
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
  _window: null | Window;
  _editable: boolean;

  constructor(
    editorState: EditorState,
    parentEditor: null | LexicalEditor,
    nodes: RegisteredNodes,
    config: EditorConfig,
    onError: ErrorHandler,
    htmlConversions: DOMConversionCache,
    editable: boolean,
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
      editable: new Set(),
      mutation: new Map(),
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
    // Used to optimize reconciliation
    this._dirtyType = NO_DIRTY_NODES;
    this._cloneNotNeeded = new Set();
    this._dirtyLeaves = new Set();
    this._dirtyElements = new Map();
    this._normalizedNodes = new Set();
    this._updateTags = new Set();
    // Handling of DOM mutations
    this._observer = null;
    // Used for identifying owning editors
    this._key = createUID();

    this._onError = onError;
    this._htmlConversions = htmlConversions;
    // We don't actually make use of the `editable` argument above.
    // Doing so, causes e2e tests around the lock to fail.
    this._editable = true;
    this._headless = parentEditor !== null && parentEditor._headless;
    this._window = null;
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

  registerEditableListener(listener: EditableListener): () => void {
    const listenerSetOrMap = this._listeners.editable;
    listenerSetOrMap.add(listener);
    return () => {
      listenerSetOrMap.delete(listener);
    };
  }

  registerDecoratorListener<T>(listener: DecoratorListener<T>): () => void {
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
        String(command),
      );
    }

    const listeners = listenersInPriorityOrder[priority];
    listeners.add(listener as CommandListener<unknown>);
    return () => {
      listeners.delete(listener as CommandListener<unknown>);

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
    klass: Klass<LexicalNode>,
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

  registerNodeTransform<T extends LexicalNode>(
    klass: Klass<T>,
    listener: Transform<T>,
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
    transforms.add(listener as Transform<LexicalNode>);
    markAllNodesAsDirty(this, type);
    return () => {
      transforms.delete(listener as Transform<LexicalNode>);
    };
  }

  hasNodes<T extends Klass<LexicalNode>>(nodes: Array<T>): boolean {
    for (let i = 0; i < nodes.length; i++) {
      const klass = nodes[i];
      const type = klass.getType();

      if (!this._nodes.has(type)) {
        return false;
      }
    }

    return true;
  }

  dispatchCommand<TCommand extends LexicalCommand<unknown>>(
    type: TCommand,
    payload: CommandPayloadType<TCommand>,
  ): boolean {
    return dispatchCommand(this, type, payload);
  }

  getDecorators<T>(): Record<NodeKey, T> {
    return this._decorators as Record<NodeKey, T>;
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
      const classNames = getCachedClassNameArray(this._config.theme, 'root');
      const pendingEditorState = this._pendingEditorState || this._editorState;
      this._rootElement = nextRootElement;
      resetEditor(this, prevRootElement, nextRootElement, pendingEditorState);

      if (prevRootElement !== null) {
        // TODO: remove this flag once we no longer use UEv2 internally
        if (!this._config.disableEvents) {
          removeRootElementEvents(prevRootElement);
        }
        if (classNames != null) {
          prevRootElement.classList.remove(...classNames);
        }
      }

      if (nextRootElement !== null) {
        const windowObj = getDefaultView(nextRootElement);
        const style = nextRootElement.style;
        style.userSelect = 'text';
        style.whiteSpace = 'pre-wrap';
        style.wordBreak = 'break-word';
        nextRootElement.setAttribute('data-lexical-editor', 'true');
        this._window = windowObj;
        this._dirtyType = FULL_RECONCILE;
        initMutationObserver(this);

        this._updateTags.add('history-merge');

        commitPendingUpdates(this);

        // TODO: remove this flag once we no longer use UEv2 internally
        if (!this._config.disableEvents) {
          addRootElementEvents(nextRootElement, this);
        }
        if (classNames != null) {
          nextRootElement.classList.add(...classNames);
        }
      } else {
        this._window = null;
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
    this._dirtyElements.set('root', false);
    this._compositionKey = null;

    if (tag != null) {
      tags.add(tag);
    }

    commitPendingUpdates(this);
  }

  parseEditorState(
    maybeStringifiedEditorState: string | SerializedEditorState,
    updateFn?: () => void,
  ): EditorState {
    const serializedEditorState =
      typeof maybeStringifiedEditorState === 'string'
        ? JSON.parse(maybeStringifiedEditorState)
        : maybeStringifiedEditorState;
    return parseEditorState(serializedEditorState, this, updateFn);
  }

  update(updateFn: () => void, options?: EditorUpdateOptions): void {
    updateEditor(this, updateFn, options);
  }

  focus(callbackFn?: () => void, options: EditorFocusOptions = {}): void {
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
            if (options.defaultSelection === 'rootStart') {
              root.selectStart();
            } else {
              root.selectEnd();
            }
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
      // In the case where onUpdate doesn't fire (due to the focus update not
      // occuring).
      if (this._pendingEditorState === null) {
        rootElement.removeAttribute('autocapitalize');
      }
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

  isEditable(): boolean {
    return this._editable;
  }

  setEditable(editable: boolean): void {
    if (this._editable !== editable) {
      this._editable = editable;
      triggerListeners('editable', this, true, editable);
    }
  }

  toJSON(): SerializedEditor {
    return {
      editorState: this._editorState.toJSON(),
    };
  }
}
