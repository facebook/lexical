/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {ReadableStore} from './Store';

import {mergeRegister} from '@lexical/utils';

const noop = () => {};

export function storeToggle<T>(
  store: ReadableStore<T>,
  isEnabled: (v: T) => boolean,
  register: () => () => void,
) {
  let cleanup = noop;
  return mergeRegister(
    () => cleanup(),
    store.subscribe((v) => {
      cleanup();
      cleanup = isEnabled(v) ? register() : noop;
    }),
  );
}

export function disabledToggle(
  stores: {readonly disabled: ReadableStore<boolean>},
  register: () => () => void,
): () => void {
  return storeToggle(stores.disabled, (v) => !v, register);
}
