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
    [tabID: number]: {[editorKey: string]: SerializedRawEditorState};
  };
  setStatesForTab: (
    id: number,
    states: {[editorKey: string]: SerializedRawEditorState},
  ) => void;
}

export const useExtensionStore = create<ExtensionState>()(
  subscribeWithSelector((set) => ({
    lexicalState: {},
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
