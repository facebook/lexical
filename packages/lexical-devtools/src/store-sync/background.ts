/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {StoreApi} from 'zustand';

import {wrapStore as reduxWrapStore} from '@eduardoac-skimlinks/webext-redux';
import {Runtime} from 'wxt/browser';

import getConfiguration from './internal/getConfiguration';

export default function storeBackgroundWrapper<T>(store: StoreApi<T>): void {
  reduxWrapStore(
    {
      dispatch(data: {_sender: Runtime.MessageSender; state: T}) {
        store.setState(data.state);

        return {payload: data.state};
      },

      getState: store.getState,

      subscribe: store.subscribe,
    },
    getConfiguration(store),
  );
}
