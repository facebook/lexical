/** @module @lexical/yjs */
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { Binding } from './Bindings';
import type { LexicalCommand } from 'lexical';
import type { Doc, RelativePosition, UndoManager, XmlText } from 'yjs';
export type UserState = {
    anchorPos: null | RelativePosition;
    color: string;
    focusing: boolean;
    focusPos: null | RelativePosition;
    name: string;
    awarenessData: object;
};
export declare const CONNECTED_COMMAND: LexicalCommand<boolean>;
export declare const TOGGLE_CONNECT_COMMAND: LexicalCommand<boolean>;
export type ProviderAwareness = {
    getLocalState: () => UserState | null;
    getStates: () => Map<number, UserState>;
    off: (type: 'update', cb: () => void) => void;
    on: (type: 'update', cb: () => void) => void;
    setLocalState: (arg0: UserState) => void;
};
declare interface Provider {
    awareness: ProviderAwareness;
    connect(): void | Promise<void>;
    disconnect(): void;
    off(type: 'sync', cb: (isSynced: boolean) => void): void;
    off(type: 'update', cb: (arg0: unknown) => void): void;
    off(type: 'status', cb: (arg0: {
        status: string;
    }) => void): void;
    off(type: 'reload', cb: (doc: Doc) => void): void;
    on(type: 'sync', cb: (isSynced: boolean) => void): void;
    on(type: 'status', cb: (arg0: {
        status: string;
    }) => void): void;
    on(type: 'update', cb: (arg0: unknown) => void): void;
    on(type: 'reload', cb: (doc: Doc) => void): void;
}
export type Operation = {
    attributes: {
        __type: string;
    };
    insert: string | Record<string, unknown>;
};
export type Delta = Array<Operation>;
export type YjsNode = Record<string, unknown>;
export type YjsEvent = Record<string, unknown>;
export type { Provider };
export type { Binding, ClientID, ExcludedProperties } from './Bindings';
export { createBinding } from './Bindings';
export declare function createUndoManager(binding: Binding, root: XmlText): UndoManager;
export declare function initLocalState(provider: Provider, name: string, color: string, focusing: boolean, awarenessData: object): void;
export declare function setLocalStateFocus(provider: Provider, name: string, color: string, focusing: boolean, awarenessData: object): void;
export { syncCursorPositions } from './SyncCursors';
export { syncLexicalUpdateToYjs, syncYjsChangesToLexical, } from './SyncEditorStates';
