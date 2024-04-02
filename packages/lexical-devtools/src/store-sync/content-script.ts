/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {StoreApi} from 'zustand';

import * as webExtBridge from 'webext-bridge/content-script';

import getConfiguration from './internal/getConfiguration';
import storeReadyPromiseBase from './internal/pages';

export default async function storeReadyPromise<T>(
  store: StoreApi<T>,
): Promise<void> {
  const configuration = getConfiguration(store);
  const proxyStore = await storeReadyPromiseBase(store, configuration);

  webExtBridge.onMessage('storeSyncGetState', () => proxyStore.getState());
  webExtBridge.onMessage('storeSyncDispatch', (message) => {
    proxyStore.dispatch({
      state: configuration.deserializer(message.data),
    });
  });

  proxyStore.subscribe(() => {
    webExtBridge
      .sendMessage(
        'storeSyncDispatch',
        configuration.serializer(proxyStore.getState()),
        'window',
      )
      // TODO: proper error handling
      .catch(console.error);
  });
}
