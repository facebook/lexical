/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {StoreApi} from 'zustand';

import {Store as ProxyStore} from '@eduardoac-skimlinks/webext-redux';

import getConfiguration from './getConfiguration';

export default async function storeReadyPromiseBase<T>(
  store: StoreApi<T>,
  configuration: ReturnType<typeof getConfiguration>,
): Promise<ProxyStore<T>> {
  const proxyStore = new ProxyStore(configuration);
  // wait to be ready
  await proxyStore.ready();
  // initial state
  store.setState(proxyStore.getState());

  const callback = (state: T, oldState: T) => {
    (proxyStore.dispatch({state}) as unknown as Promise<T>)
      .then((syncedState) => {
        if (!syncedState) {
          // error (edge case)
          // prevent infinite loop
          unsubscribe();
          // revert
          store.setState(oldState);
          // resub
          unsubscribe = store.subscribe(callback);
        }
      })
      .catch((err) => {
        if (
          err instanceof Error &&
          err.message === 'Extension context invalidated.'
        ) {
          console.warn(
            'Webext-Zustand: Reloading page as we lost connection to background script...',
          );
          window.location.reload();
          return;
        }
        console.error('Error during store dispatch', err);
      });
  };

  let unsubscribe = store.subscribe(callback);

  proxyStore.subscribe(() => {
    // prevent retrigger
    unsubscribe();
    // update
    const state = proxyStore.getState();
    store.setState(state);
    // resub
    unsubscribe = store.subscribe(callback);
  });

  return proxyStore;
}
