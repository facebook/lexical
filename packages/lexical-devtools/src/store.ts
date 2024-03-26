/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {EditorState} from 'lexical';

import {create} from 'zustand';
import {subscribeWithSelector} from 'zustand/middleware';

export interface ExtensionState {
  lexicalState: {[tabID: number]: {[editorKey: string]: EditorState}};
  setStatesForTab: (
    id: number,
    states: {[editorKey: string]: EditorState},
  ) => void;
}

export const useExtensionStore = create<ExtensionState>()(
  subscribeWithSelector((set) => ({
    lexicalState: {},
    setStatesForTab: (id: number, states: {[editorKey: string]: EditorState}) =>
      set((state) => ({
        lexicalState: {
          ...state.lexicalState,
          [id]: states,
        },
      })),
  })),
);

export default useExtensionStore;
