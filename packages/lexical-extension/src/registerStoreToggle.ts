/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {ReadableStore} from './Store';

import {mergeRegister} from '@lexical/utils';

export function registerStoreToggle<T>(
  store: ReadableStore<T>,
  isEnabled: (value: T) => boolean,
  register: () => () => void,
): () => void {
  let cleanup: null | (() => void) = null;
  const performCleanup = () => {
    if (cleanup) {
      cleanup();
      cleanup = null;
    }
  };
  return mergeRegister(
    performCleanup,
    store.subscribe((value) => {
      performCleanup();
      if (isEnabled(value)) {
        cleanup = register();
      }
    }),
  );
}
