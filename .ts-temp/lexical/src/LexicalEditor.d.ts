/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { EditorState, SerializedEditorState } from './LexicalEditorState';
import type { DOMConversion, LexicalNode, NodeKey } from './LexicalNode';
import { Class } from 'utility-types';
export declare type Spread<T1, T2> = {
    [K in Exclude<keyof T1, keyof T2>]: T1[K];
} & T2;
export declare type EditorThemeClassName = string;
export declare type TextNodeThemeClasses = {
    base?: EditorThemeClassName;
    bold?: EditorThemeClassName;
    code?: EditorThemeClassName;
    italic?: EditorThemeClassName;
    strikethrough?: EditorThemeClassName;
    underline?: EditorThemeClassName;
    underlineStrikethrough?: EditorThemeClassName;
};
export declare type EditorUpdateOptions = {
    onUpdate?: () => void;
    skipTransforms?: true;
    tag?: string;
};
export declare type EditorSetOptions = {
    tag?: string;
};
export declare type EditorThemeClasses = {
    code?: EditorThemeClassName;
    codeHighlight?: Record<string, EditorThemeClassName>;
    hashtag?: EditorThemeClassName;
    heading?: {
        h1?: EditorThemeClassName;
        h2?: EditorThemeClassName;
        h3?: EditorThemeClassName;
        h4?: EditorThemeClassName;
        h5?: EditorThemeClassName;
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
    tableCell?: EditorThemeClassName;
    tableCellHeader?: EditorThemeClassName;
    tableRow?: EditorThemeClassName;
    text?: TextNodeThemeClasses;
    [key: string]: EditorThemeClassName | TextNodeThemeClasses | {
        [key: string]: Array<EditorThemeClassName> | EditorThemeClassName | TextNodeThemeClasses | {
            [key: string]: EditorThemeClassName;
        };
    };
};
export declare type EditorConfig = {
    disableEvents?: boolean;
    theme: EditorThemeClasses;
};
export declare type RegisteredNodes = Map<string, RegisteredNode>;
export declare type RegisteredNode = {
    klass: Class<LexicalNode>;
    transforms: Set<Transform<LexicalNode>>;
};
export declare type Transform<T> = (node: T) => void;
export declare type ErrorHandler = (error: Error) => void;
export declare type MutationListeners = Map<MutationListener, Class<LexicalNode>>;
export declare type MutatedNodes = Map<Class<LexicalNode>, Map<NodeKey, NodeMutation>>;
export declare type NodeMutation = 'created' | 'updated' | 'destroyed';
export declare type UpdateListener = (arg0: {
    dirtyElements: Map<NodeKey, IntentionallyMarkedAsDirtyElement>;
    dirtyLeaves: Set<NodeKey>;
    editorState: EditorState;
    normalizedNodes: Set<NodeKey>;
    prevEditorState: EditorState;
    tags: Set<string>;
}) => void;
export declare type DecoratorListener<T = unknown> = (decorator: Record<NodeKey, T>) => void;
export declare type RootListener = (rootElement: null | HTMLElement, prevRootElement: null | HTMLElement) => void;
export declare type TextContentListener = (text: string) => void;
export declare type MutationListener = (nodes: Map<NodeKey, NodeMutation>) => void;
export declare type CommandListener<P> = (payload: P, editor: LexicalEditor) => boolean;
export declare type ReadOnlyListener = (readOnly: boolean) => void;
export declare type CommandListenerPriority = 0 | 1 | 2 | 3 | 4;
export declare const COMMAND_PRIORITY_EDITOR = 0;
export declare const COMMAND_PRIORITY_LOW = 1;
export declare const COMMAND_PRIORITY_NORMAL = 2;
export declare const COMMAND_PRIORITY_HIGH = 3;
export declare const COMMAND_PRIORITY_CRITICAL = 4;
export declare type LexicalCommand<T> = Readonly<Record<string, unknown>>;
declare type Commands = Map<LexicalCommand<unknown>, Array<Set<CommandListener<unknown>>>>;
declare type Listeners = {
    decorator: Set<DecoratorListener>;
    mutation: MutationListeners;
    readonly: Set<ReadOnlyListener>;
    root: Set<RootListener>;
    textcontent: Set<TextContentListener>;
    update: Set<UpdateListener>;
};
export declare type Listener = DecoratorListener | ReadOnlyListener | MutationListener | RootListener | TextContentListener | UpdateListener;
export declare type ListenerType = 'update' | 'root' | 'decorator' | 'textcontent' | 'mutation' | 'readonly';
export declare type TransformerType = 'text' | 'decorator' | 'element' | 'root';
export declare type IntentionallyMarkedAsDirtyElement = boolean;
declare type DOMConversionCache = Map<string, Array<(node: Node) => DOMConversion | null>>;
export declare function resetEditor(editor: LexicalEditor, prevRootElement: null | HTMLElement, nextRootElement: null | HTMLElement, pendingEditorState: EditorState): void;
export declare function createEditor(editorConfig?: {
    disableEvents?: boolean;
    editorState?: EditorState;
    nodes?: ReadonlyArray<Class<LexicalNode>>;
    onError?: ErrorHandler;
    parentEditor?: LexicalEditor;
    readOnly?: boolean;
    theme?: EditorThemeClasses;
}): LexicalEditor;
export declare class LexicalEditor {
    _headless: boolean;
    _parentEditor: null | LexicalEditor;
    _rootElement: null | HTMLElement;
    _editorState: EditorState;
    _pendingEditorState: null | EditorState;
    _compositionKey: null | NodeKey;
    _deferred: Array<() => void>;
    _keyToDOMMap: Map<NodeKey, HTMLElement>;
    _updates: Array<[() => void, EditorUpdateOptions]>;
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
    _readOnly: boolean;
    constructor(editorState: EditorState, parentEditor: null | LexicalEditor, nodes: RegisteredNodes, config: EditorConfig, onError: ErrorHandler, htmlConversions: DOMConversionCache, readOnly: boolean);
    isComposing(): boolean;
    registerUpdateListener(listener: UpdateListener): () => void;
    registerReadOnlyListener(listener: ReadOnlyListener): () => void;
    registerDecoratorListener<T>(listener: DecoratorListener<T>): () => void;
    registerTextContentListener(listener: TextContentListener): () => void;
    registerRootListener(listener: RootListener): () => void;
    registerCommand<P>(command: LexicalCommand<P>, listener: CommandListener<P>, priority: CommandListenerPriority): () => void;
    registerMutationListener(klass: Class<LexicalNode>, listener: MutationListener): () => void;
    registerNodeTransform<T extends LexicalNode>(klass: Class<T>, listener: Transform<T>): () => void;
    hasNodes(nodes: Array<Class<LexicalNode>>): boolean;
    dispatchCommand<P>(type: LexicalCommand<P>, payload: P): boolean;
    getDecorators<T>(): Record<NodeKey, T>;
    getRootElement(): null | HTMLElement;
    getKey(): string;
    setRootElement(nextRootElement: null | HTMLElement): void;
    getElementByKey(key: NodeKey): HTMLElement | null;
    getEditorState(): EditorState;
    setEditorState(editorState: EditorState, options?: EditorSetOptions): void;
    parseEditorState(maybeStringifiedEditorState: string | SerializedEditorState, updateFn?: () => void): EditorState;
    update(updateFn: () => void, options?: EditorUpdateOptions): void;
    focus(callbackFn?: () => void): void;
    blur(): void;
    isReadOnly(): boolean;
    setReadOnly(readOnly: boolean): void;
    toJSON(): {
        editorState: EditorState;
    };
}
export {};
