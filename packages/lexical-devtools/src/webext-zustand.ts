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
  } else if (isPages()) {
    return handlePages(store, {
      deserializer,
      portName,
      serializer,
    });
  } else {
    return handleInjected(store, {
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
  configuration: Exclude<PagesConfiguration, undefined>,
) => {
  const serializer = configuration.serializer ?? JSON.stringify;
  const deserializer = configuration.deserializer ?? JSON.parse;

  const inContentScript = isContentScript();
  let stateTransferEl: HTMLScriptElement | null = null;

  const proxyStore = new ProxyStore(configuration);
  // wait to be ready
  await proxyStore.ready();
  // initial state
  store.setState(proxyStore.getState());
  if (inContentScript) {
    stateTransferEl = document.createElement('script');
    stateTransferEl.setAttribute('id', configuration.portName ?? '');
    stateTransferEl.setAttribute('type', 'application/json');
    stateTransferEl.innerHTML = serializer(proxyStore.getState());
    window.document.head.appendChild(stateTransferEl);
  }

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
    if (inContentScript) {
      // Propagate state to injected script
      if (stateTransferEl != null) {
        const newStateStr = serializer(proxyStore.getState());
        if (newStateStr !== stateTransferEl.innerHTML) {
          stateTransferEl.innerHTML = newStateStr;
        }
      }
    }
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
    if (inContentScript) {
      // Propagate state to injected script
      if (stateTransferEl != null) {
        const newStateStr = serializer(proxyStore.getState());
        if (newStateStr !== stateTransferEl.innerHTML) {
          stateTransferEl.innerHTML = newStateStr;
        }
      }
    }
  });

  if (stateTransferEl != null) {
    const observer = new MutationObserver(() => {
      // TODO: error handling
      proxyStore.dispatch({state: deserializer(stateTransferEl.innerHTML)});
    });
    observer.observe(stateTransferEl, {
      attributes: false,
      characterData: false,
      childList: true,
      subtree: true,
    });
  }
};

const handleInjected = async <T>(
  store: StoreApi<T>,
  configuration: Exclude<PagesConfiguration, undefined>,
) => {
  const serializer = configuration.serializer ?? JSON.stringify;
  const deserializer = configuration.deserializer ?? JSON.parse;

  const stateTransferEl = document.getElementById(
    configuration.portName ?? 'FIXME',
  );
  if (stateTransferEl == null) {
    throw new Error("Can't find state stansfer element");
  }

  // initial state
  store.setState(deserializer(stateTransferEl.innerHTML));

  const callback = (state: T) => {
    const newStateStr = serializer(state);
    if (newStateStr !== stateTransferEl.innerHTML) {
      stateTransferEl.innerHTML = newStateStr;
    }
  };
  let unsubscribe = store.subscribe(callback);

  const observer = new MutationObserver(() => {
    const oldStateStr = serializer(store.getState());
    if (oldStateStr === stateTransferEl.innerHTML) {
      return;
    }
    // prevent retrigger
    unsubscribe();
    // update
    store.setState(deserializer(stateTransferEl.innerHTML));
    // resubscribe
    unsubscribe = store.subscribe(callback);
  });
  observer.observe(stateTransferEl, {
    attributes: false,
    characterData: false,
    childList: true,
    subtree: true,
  });
};

const isPages = () => chrome.runtime !== undefined;
const isContentScript = () =>
  chrome.runtime !== undefined &&
  window.location.protocol !== 'chrome-extension:';

const isBackground = () => {
  const isCurrentPathname = (path?: string | null) =>
    path
      ? new URL(path, window.location.origin).pathname ===
        window.location.pathname
      : false;

  if (chrome.runtime === undefined) {
    return false;
  }

  const manifest = chrome.runtime.getManifest();

  return (
    // eslint-disable-next-line no-restricted-globals
    !self.window ||
    (chrome.extension.getBackgroundPage &&
      typeof window !== 'undefined' &&
      chrome.extension.getBackgroundPage() === window) ||
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
