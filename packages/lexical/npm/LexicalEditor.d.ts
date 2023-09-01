/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { EditorState, SerializedEditorState } from './LexicalEditorState';
import type { DOMConversion, NodeKey } from './LexicalNode';
import { LexicalNode } from './LexicalNode';
export type Spread<T1, T2> = Omit<T2, keyof T1> & T1;
export type Klass<T extends LexicalNode> = {
    new (...args: any[]): T;
} & Omit<LexicalNode, 'constructor'>;
export type EditorThemeClassName = string;
export type TextNodeThemeClasses = {
    base?: EditorThemeClassName;
    bold?: EditorThemeClassName;
    code?: EditorThemeClassName;
    highlight?: EditorThemeClassName;
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
    blockCursor?: EditorThemeClassName;
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
    indent?: EditorThemeClassName;
    [key: string]: any;
};
export type EditorConfig = {
    disableEvents?: boolean;
    namespace: string;
    theme: EditorThemeClasses;
};
export type CreateEditorArgs = {
    disableEvents?: boolean;
    editorState?: EditorState;
    namespace?: string;
    nodes?: ReadonlyArray<Klass<LexicalNode> | {
        replace: Klass<LexicalNode>;
        with: <T extends {
            new (...args: any): any;
        }>(node: InstanceType<T>) => LexicalNode;
        withKlass?: Klass<LexicalNode>;
    }>;
    onError?: ErrorHandler;
    parentEditor?: LexicalEditor;
    editable?: boolean;
    theme?: EditorThemeClasses;
};
export type RegisteredNodes = Map<string, RegisteredNode>;
export type RegisteredNode = {
    klass: Klass<LexicalNode>;
    transforms: Set<Transform<LexicalNode>>;
    replace: null | ((node: LexicalNode) => LexicalNode);
    replaceWithKlass: null | Klass<LexicalNode>;
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
export type DecoratorListener<T = never> = (decorator: Record<NodeKey, T>) => void;
export type RootListener = (rootElement: null | HTMLElement, prevRootElement: null | HTMLElement) => void;
export type TextContentListener = (text: string) => void;
export type MutationListener = (nodes: Map<NodeKey, NodeMutation>, payload: {
    updateTags: Set<string>;
    dirtyLeaves: Set<string>;
    prevEditorState: EditorState;
}) => void;
export type CommandListener<P> = (payload: P, editor: LexicalEditor) => boolean;
export type EditableListener = (editable: boolean) => void;
export type CommandListenerPriority = 0 | 1 | 2 | 3 | 4;
export declare const COMMAND_PRIORITY_EDITOR = 0;
export declare const COMMAND_PRIORITY_LOW = 1;
export declare const COMMAND_PRIORITY_NORMAL = 2;
export declare const COMMAND_PRIORITY_HIGH = 3;
export declare const COMMAND_PRIORITY_CRITICAL = 4;
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
export type CommandPayloadType<TCommand extends LexicalCommand<unknown>> = TCommand extends LexicalCommand<infer TPayload> ? TPayload : never;
type Commands = Map<LexicalCommand<unknown>, Array<Set<CommandListener<unknown>>>>;
type Listeners = {
    decorator: Set<DecoratorListener>;
    mutation: MutationListeners;
    editable: Set<EditableListener>;
    root: Set<RootListener>;
    textcontent: Set<TextContentListener>;
    update: Set<UpdateListener>;
};
export type Listener = DecoratorListener | EditableListener | MutationListener | RootListener | TextContentListener | UpdateListener;
export type ListenerType = 'update' | 'root' | 'decorator' | 'textcontent' | 'mutation' | 'editable';
export type TransformerType = 'text' | 'decorator' | 'element' | 'root';
type IntentionallyMarkedAsDirtyElement = boolean;
type DOMConversionCache = Map<string, Array<(node: Node) => DOMConversion | null>>;
export type SerializedEditor = {
    editorState: SerializedEditorState;
};
export declare function resetEditor(editor: LexicalEditor, prevRootElement: null | HTMLElement, nextRootElement: null | HTMLElement, pendingEditorState: EditorState): void;
/**
 * Creates a new LexicalEditor attached to a single contentEditable (provided in the config). This is
 * the lowest-level initialization API for a LexicalEditor. If you're using React or another framework,
 * consider using the appropriate abstractions, such as LexicalComposer
 * @param editorConfig - the editor configuration.
 * @returns a LexicalEditor instance
 */
export declare function createEditor(editorConfig?: CreateEditorArgs): LexicalEditor;
export declare class LexicalEditor {
    /** @internal */
    _headless: boolean;
    /** @internal */
    _parentEditor: null | LexicalEditor;
    /** @internal */
    _rootElement: null | HTMLElement;
    /** @internal */
    _editorState: EditorState;
    /** @internal */
    _pendingEditorState: null | EditorState;
    /** @internal */
    _compositionKey: null | NodeKey;
    /** @internal */
    _deferred: Array<() => void>;
    /** @internal */
    _keyToDOMMap: Map<NodeKey, HTMLElement>;
    /** @internal */
    _updates: Array<[() => void, EditorUpdateOptions | undefined]>;
    /** @internal */
    _updating: boolean;
    /** @internal */
    _listeners: Listeners;
    /** @internal */
    _commands: Commands;
    /** @internal */
    _nodes: RegisteredNodes;
    /** @internal */
    _decorators: Record<NodeKey, unknown>;
    /** @internal */
    _pendingDecorators: null | Record<NodeKey, unknown>;
    /** @internal */
    _config: EditorConfig;
    /** @internal */
    _dirtyType: 0 | 1 | 2;
    /** @internal */
    _cloneNotNeeded: Set<NodeKey>;
    /** @internal */
    _dirtyLeaves: Set<NodeKey>;
    /** @internal */
    _dirtyElements: Map<NodeKey, IntentionallyMarkedAsDirtyElement>;
    /** @internal */
    _normalizedNodes: Set<NodeKey>;
    /** @internal */
    _updateTags: Set<string>;
    /** @internal */
    _observer: null | MutationObserver;
    /** @internal */
    _key: string;
    /** @internal */
    _onError: ErrorHandler;
    /** @internal */
    _htmlConversions: DOMConversionCache;
    /** @internal */
    _window: null | Window;
    /** @internal */
    _editable: boolean;
    /** @internal */
    _blockCursorElement: null | HTMLDivElement;
    /** @internal */
    constructor(editorState: EditorState, parentEditor: null | LexicalEditor, nodes: RegisteredNodes, config: EditorConfig, onError: ErrorHandler, htmlConversions: DOMConversionCache, editable: boolean);
    /**
     *
     * @returns true if the editor is currently in "composition" mode due to receiving input
     * through an IME, or 3P extension, for example. Returns false otherwise.
     */
    isComposing(): boolean;
    /**
     * Registers a listener for Editor update event. Will trigger the provided callback
     * each time the editor goes through an update (via {@link LexicalEditor.update}) until the
     * teardown function is called.
     *
     * @returns a teardown function that can be used to cleanup the listener.
     */
    registerUpdateListener(listener: UpdateListener): () => void;
    /**
     * Registers a listener for for when the editor changes between editable and non-editable states.
     * Will trigger the provided callback each time the editor transitions between these states until the
     * teardown function is called.
     *
     * @returns a teardown function that can be used to cleanup the listener.
     */
    registerEditableListener(listener: EditableListener): () => void;
    /**
     * Registers a listener for when the editor's decorator object changes. The decorator object contains
     * all DecoratorNode keys -> their decorated value. This is primarily used with external UI frameworks.
     *
     * Will trigger the provided callback each time the editor transitions between these states until the
     * teardown function is called.
     *
     * @returns a teardown function that can be used to cleanup the listener.
     */
    registerDecoratorListener<T>(listener: DecoratorListener<T>): () => void;
    /**
     * Registers a listener for when Lexical commits an update to the DOM and the text content of
     * the editor changes from the previous state of the editor. If the text content is the
     * same between updates, no notifications to the listeners will happen.
     *
     * Will trigger the provided callback each time the editor transitions between these states until the
     * teardown function is called.
     *
     * @returns a teardown function that can be used to cleanup the listener.
     */
    registerTextContentListener(listener: TextContentListener): () => void;
    /**
     * Registers a listener for when the editor's root DOM element (the content editable
     * Lexical attaches to) changes. This is primarily used to attach event listeners to the root
     *  element. The root listener function is executed directly upon registration and then on
     * any subsequent update.
     *
     * Will trigger the provided callback each time the editor transitions between these states until the
     * teardown function is called.
     *
     * @returns a teardown function that can be used to cleanup the listener.
     */
    registerRootListener(listener: RootListener): () => void;
    /**
     * Registers a listener that will trigger anytime the provided command
     * is dispatched, subject to priority. Listeners that run at a higher priority can "intercept"
     * commands and prevent them from propagating to other handlers by returning true.
     *
     * Listeners registered at the same priority level will run deterministically in the order of registration.
     *
     * @param command - the command that will trigger the callback.
     * @param listener - the function that will execute when the command is dispatched.
     * @param priority - the relative priority of the listener. 0 | 1 | 2 | 3 | 4
     * @returns a teardown function that can be used to cleanup the listener.
     */
    registerCommand<P>(command: LexicalCommand<P>, listener: CommandListener<P>, priority: CommandListenerPriority): () => void;
    /**
     * Registers a listener that will run when a Lexical node of the provided class is
     * mutated. The listener will receive a list of nodes along with the type of mutation
     * that was performed on each: created, destroyed, or updated.
     *
     * One common use case for this is to attach DOM event listeners to the underlying DOM nodes as Lexical nodes are created.
     * {@link LexicalEditor.getElementByKey} can be used for this.
     *
     * @param klass - The class of the node that you want to listen to mutations on.
     * @param listener - The logic you want to run when the node is mutated.
     * @returns a teardown function that can be used to cleanup the listener.
     */
    registerMutationListener(klass: Klass<LexicalNode>, listener: MutationListener): () => void;
    /** @internal */
    private registerNodeTransformToKlass;
    /**
     * Registers a listener that will run when a Lexical node of the provided class is
     * marked dirty during an update. The listener will continue to run as long as the node
     * is marked dirty. There are no guarantees around the order of transform execution!
     *
     * Watch out for infinite loops. See [Node Transforms](https://lexical.dev/docs/concepts/transforms)
     * @param klass - The class of the node that you want to run transforms on.
     * @param listener - The logic you want to run when the node is updated.
     * @returns a teardown function that can be used to cleanup the listener.
     */
    registerNodeTransform<T extends LexicalNode>(klass: Klass<T>, listener: Transform<T>): () => void;
    /**
     * Used to assert that a certain node is registered, usually by plugins to ensure nodes that they
     * depend on have been registered.
     * @returns True if the editor has registered the provided node type, false otherwise.
     */
    hasNode<T extends Klass<LexicalNode>>(node: T): boolean;
    /**
     * Used to assert that certain nodes are registered, usually by plugins to ensure nodes that they
     * depend on have been registered.
     * @returns True if the editor has registered all of the provided node types, false otherwise.
     */
    hasNodes<T extends Klass<LexicalNode>>(nodes: Array<T>): boolean;
    /**
     * Dispatches a command of the specified type with the specified payload.
     * This triggers all command listeners (set by {@link LexicalEditor.registerCommand})
     * for this type, passing them the provided payload.
     * @param type - the type of command listeners to trigger.
     * @param payload - the data to pass as an argument to the command listeners.
     */
    dispatchCommand<TCommand extends LexicalCommand<unknown>>(type: TCommand, payload: CommandPayloadType<TCommand>): boolean;
    /**
     * Gets a map of all decorators in the editor.
     * @returns A mapping of call decorator keys to their decorated content
     */
    getDecorators<T>(): Record<NodeKey, T>;
    /**
     *
     * @returns the current root element of the editor. If you want to register
     * an event listener, do it via {@link LexicalEditor.registerRootListener}, since
     * this reference may not be stable.
     */
    getRootElement(): null | HTMLElement;
    /**
     * Gets the key of the editor
     * @returns The editor key
     */
    getKey(): string;
    /**
     * Imperatively set the root contenteditable element that Lexical listens
     * for events on.
     */
    setRootElement(nextRootElement: null | HTMLElement): void;
    /**
     * Gets the underlying HTMLElement associated with the LexicalNode for the given key.
     * @returns the HTMLElement rendered by the LexicalNode associated with the key.
     * @param key - the key of the LexicalNode.
     */
    getElementByKey(key: NodeKey): HTMLElement | null;
    /**
     * Gets the active editor state.
     * @returns The editor state
     */
    getEditorState(): EditorState;
    /**
     * Imperatively set the EditorState. Triggers reconciliation like an update.
     * @param editorState - the state to set the editor
     * @param options - options for the update.
     */
    setEditorState(editorState: EditorState, options?: EditorSetOptions): void;
    /**
     * Parses a SerializedEditorState (usually produced by {@link EditorState.toJSON}) and returns
     * and EditorState object that can be, for example, passed to {@link LexicalEditor.setEditorState}. Typically,
     * deserliazation from JSON stored in a database uses this method.
     * @param maybeStringifiedEditorState
     * @param updateFn
     * @returns
     */
    parseEditorState(maybeStringifiedEditorState: string | SerializedEditorState, updateFn?: () => void): EditorState;
    /**
     * Executes an update to the editor state. The updateFn callback is the ONLY place
     * where Lexical editor state can be safely mutated.
     * @param updateFn - A function that has access to writable editor state.
     * @param options - A bag of options to control the behavior of the update.
     * @param options.onUpdate - A function to run once the update is complete.
     * Useful for synchronizing updates in some cases.
     * @param options.skipTransforms - Setting this to true will suppress all node
     * transforms for this update cycle.
     * @param options.tag - A tag to identify this update, in an update listener, for instance.
     * Some tags are reserved by the core and control update behavior in different ways.
     * @param options.discrete - If true, prevents this update from being batched, forcing it to
     * run synchronously.
     */
    update(updateFn: () => void, options?: EditorUpdateOptions): void;
    /**
     * Focuses the editor
     * @param callbackFn - A function to run after the editor is focused.
     * @param options - A bag of options
     * @param options.defaultSelection - Where to move selection when the editor is
     * focused. Can be rootStart, rootEnd, or undefined. Defaults to rootEnd.
     */
    focus(callbackFn?: () => void, options?: EditorFocusOptions): void;
    /**
     * Removes focus from the editor.
     */
    blur(): void;
    /**
     * Returns true if the editor is editable, false otherwise.
     * @returns True if the editor is editable, false otherwise.
     */
    isEditable(): boolean;
    /**
     * Sets the editable property of the editor. When false, the
     * editor will not listen for user events on the underling contenteditable.
     * @param editable - the value to set the editable mode to.
     */
    setEditable(editable: boolean): void;
    /**
     * Returns a JSON-serializable javascript object NOT a JSON string.
     * You still must call JSON.stringify (or something else) to turn the
     * state into a string you can transfer over the wire and store in a database.
     *
     * See {@link LexicalNode.exportJSON}
     *
     * @returns A JSON-serializable javascript object
     */
    toJSON(): SerializedEditor;
}
export {};
