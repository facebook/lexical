/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {wrapStore} from 'webext-zustand';
import {create} from 'zustand';

interface ExtensionState {
  counter: number;
  increase: (by: number) => void;
}

export const useExtensionStore = create<ExtensionState>()((set) => ({
  counter: 0,
  increase: (by) => set((state) => ({counter: state.counter + by})),
}));

export const storeReadyPromise = wrapStore(useExtensionStore);

export default useExtensionStore;
