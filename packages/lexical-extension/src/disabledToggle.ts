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
export function disabledToggle(
  stores: {readonly disabled: ReadableStore<boolean>},
  register: () => () => void,
): () => void {
  let cleanup = noop;
  return mergeRegister(
    () => cleanup(),
    stores.disabled.subscribe((disabled) => {
      cleanup();
      cleanup = disabled ? noop : register();
    }),
  );
}
