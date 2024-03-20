/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {StoreApi} from 'zustand';

import {
  Store as ProxyStore,
  wrapStore as reduxWrapStore,
} from '@eduardoac-skimlinks/webext-redux';
import {Runtime} from 'wxt/browser';

export const wrapStore = async <T>(store: StoreApi<T>) => {
  const portName = PORTNAME_PREFIX + getStoreId(store);
  const serializer = (payload: unknown) => JSON.stringify(payload);
  const deserializer = (payload: string) => JSON.parse(payload);

  if (isBackground()) {
    handleBackground(store, {
      deserializer,
      portName,
      serializer,
    });

    return;
  } else {
    return handlePages(store, {
      deserializer,
      portName,
      serializer,
    });
  }
};

const handleBackground = <T>(
  store: StoreApi<T>,
  configuration?: BackgroundConfiguration,
) => {
  reduxWrapStore(
    {
      dispatch(data: {_sender: Runtime.MessageSender; state: T}) {
        store.setState(data.state);

        return {payload: data.state};
      },

      getState: store.getState,

      subscribe: store.subscribe,
    },
    configuration,
  );
};

const handlePages = async <T>(
  store: StoreApi<T>,
  configuration?: PagesConfiguration,
) => {
  const proxyStore = new ProxyStore(configuration);
  // wait to be ready
  await proxyStore.ready();
  // initial state
  store.setState(proxyStore.getState());

  const callback = (state: T, oldState: T) => {
    (proxyStore.dispatch({state}) as unknown as Promise<T>)
      .then((syncedState) => {
        if (syncedState) {
          // success
        } else {
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
    store.setState(proxyStore.getState());
    // resub
    unsubscribe = store.subscribe(callback);
  });
};

const isBackground = () => {
  const isCurrentPathname = (path?: string | null) =>
    path
      ? new URL(path, window.location.origin).pathname ===
        window.location.pathname
      : false;

  const manifest = browser.runtime.getManifest();

  return (
    // eslint-disable-next-line no-restricted-globals
    !self.window ||
    (browser.extension.getBackgroundPage &&
      typeof window !== 'undefined' &&
      browser.extension.getBackgroundPage() === window) ||
    (manifest &&
      // @ts-expect-error
      (isCurrentPathname(manifest.background_page) ||
        (manifest.background &&
          'page' in manifest.background &&
          isCurrentPathname(manifest.background.page)) ||
        Boolean(
          manifest.background &&
            'scripts' in manifest.background &&
            manifest.background.scripts &&
            isCurrentPathname('/_generated_background_page.html'),
        )))
  );
};

type BackgroundConfiguration = Parameters<typeof reduxWrapStore>[1];
type PagesConfiguration = ConstructorParameters<typeof ProxyStore>[0];

const getStoreId = (() => {
  let id = 0;
  const map = new WeakMap();

  return <T>(store: StoreApi<T>): number => {
    if (!map.has(store)) {
      map.set(store, ++id);
    }

    return map.get(store);
  };
})();

const PORTNAME_PREFIX = `webext-zustand-`;
