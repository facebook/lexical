/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  initPegasusZustandStoreBackend,
  pegasusZustandStoreReady,
} from '@webext-pegasus/store-zustand';
import {create} from 'zustand';
import {subscribeWithSelector} from 'zustand/middleware';

import {SerializedRawEditorState} from './types';

export interface ExtensionState {
  lexicalState: {
    [tabID: number]: {[editorKey: string]: SerializedRawEditorState} | null;
  };
  selectedEditorKey: {
    [tabID: number]: string | null;
  };
  markTabAsRestricted: (tabID: number) => void;
  setStatesForTab: (
    id: number,
    states: {[editorKey: string]: SerializedRawEditorState},
  ) => void;
  setSelectedEditorKey: (tabID: number, editorKey: string | null) => void;
}

export const useExtensionStore = create<ExtensionState>()(
  subscribeWithSelector((set) => ({
    lexicalState: {},
    markTabAsRestricted: (tabID: number) =>
      set((state) => ({
        lexicalState: {
          ...state.lexicalState,
          [tabID]: null,
        },
      })),
    selectedEditorKey: {},
    setSelectedEditorKey: (tabID: number, editorKey: string | null) =>
      set((state) => ({
        selectedEditorKey: {
          ...state.selectedEditorKey,
          [tabID]: editorKey,
        },
      })),
    setStatesForTab: (
      id: number,
      states: {[editorKey: string]: SerializedRawEditorState},
    ) =>
      set((state) => ({
        lexicalState: {
          ...state.lexicalState,
          [id]: states,
        },
      })),
  })),
);

const STORE_NAME = 'ExtensionStore';

export const initExtensionStoreBackend = () =>
  initPegasusZustandStoreBackend(STORE_NAME, useExtensionStore);
export const extensionStoreReady = () =>
  pegasusZustandStoreReady(STORE_NAME, useExtensionStore);
