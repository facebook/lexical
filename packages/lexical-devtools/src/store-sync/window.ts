/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {StoreApi} from 'zustand';

import * as webExtBridge from 'webext-bridge/window';

import getConfiguration from './internal/getConfiguration';

export default async function storeReadyPromise<T>(
  store: StoreApi<T>,
): Promise<void> {
  const configuration = getConfiguration(store);
  let unsubscribe = () => {};

  webExtBridge.onMessage('storeSyncDispatch', (message) => {
    const oldStateStr = configuration.serializer(store.getState());
    if (oldStateStr === message.data) {
      return;
    }
    // prevent retrigger
    unsubscribe();
    // update
    store.setState(configuration.deserializer(message.data));
    // resubscribe
    unsubscribe = store.subscribe(callback);
  });

  // initial state
  store.setState(
    // TODO: proper error handling
    (await webExtBridge.sendMessage(
      'storeSyncGetState',
      null,
      'content-script',
    )) as T,
  );

  const callback = (state: T) => {
    webExtBridge
      .sendMessage(
        'storeSyncDispatch',
        configuration.serializer(state),
        'content-script',
      )
      // TODO: proper error handling
      .catch(console.error);
  };
  unsubscribe = store.subscribe(callback);
}
