/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { SerializedRawEditorState } from './types';
export interface ExtensionState {
    lexicalState: {
        [tabID: number]: {
            [editorKey: string]: SerializedRawEditorState;
        } | null;
    };
    selectedEditorKey: {
        [tabID: number]: string | null;
    };
    isSelecting: {
        [tabID: number]: boolean;
    };
    markTabAsRestricted: (tabID: number) => void;
    setStatesForTab: (id: number, states: {
        [editorKey: string]: SerializedRawEditorState;
    }) => void;
    setSelectedEditorKey: (tabID: number, editorKey: string | null) => void;
    setIsSelecting: (tadID: number, isSelecting: boolean) => void;
}
export declare const useExtensionStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<ExtensionState>, "subscribe"> & {
    subscribe: {
        (listener: (selectedState: ExtensionState, previousSelectedState: ExtensionState) => void): () => void;
        <U>(selector: (state: ExtensionState) => U, listener: (selectedState: U, previousSelectedState: U) => void, options?: {
            equalityFn?: ((a: U, b: U) => boolean) | undefined;
            fireImmediately?: boolean;
        } | undefined): () => void;
    };
}>;
export declare const initExtensionStoreBackend: () => Promise<import("zustand").StoreApi<ExtensionState>>;
export declare const extensionStoreReady: () => Promise<import("zustand").StoreApi<ExtensionState>>;
//# sourceMappingURL=store.d.ts.map