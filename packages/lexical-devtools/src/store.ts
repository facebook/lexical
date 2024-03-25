/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {EditorState} from 'lexical';
import {uniq} from 'lodash';
import {create} from 'zustand';
import {subscribeWithSelector} from 'zustand/middleware';

export interface ExtensionState {
  devtoolsPanelLoadedForTabIDs: number[];
  devtoolsPanelLoadedForTabID: (id: number) => void;
  devtoolsPanelUnloadedForTabID: (id: number) => void;
  counter: number;
  increase: (by: number) => void;
  lexicalState: {[tabID: number]: {[editorKey: string]: EditorState}};
  setStatesForTab: (
    id: number,
    states: {[editorKey: string]: EditorState},
  ) => void;
}

export const useExtensionStore = create<ExtensionState>()(
  subscribeWithSelector((set) => ({
    counter: 0,
    devtoolsPanelLoadedForTabID: (id) =>
      set((state) => ({
        devtoolsPanelLoadedForTabIDs: uniq([
          ...state.devtoolsPanelLoadedForTabIDs,
          id,
        ]),
      })),
    devtoolsPanelLoadedForTabIDs: [],
    devtoolsPanelUnloadedForTabID: (id) =>
      set((state) => ({
        devtoolsPanelLoadedForTabIDs: state.devtoolsPanelLoadedForTabIDs.filter(
          (v) => v !== id,
        ),
      })),
    increase: (by) => set((state) => ({counter: state.counter + by})),
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
