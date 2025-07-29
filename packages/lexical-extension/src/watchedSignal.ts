/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {type Signal, signal} from './signals';

export function watchedSignal<T>(
  initialValue: T,
  register: (self: Signal<T>) => () => void,
): Signal<T> {
  let dispose: undefined | (() => void);
  return signal(initialValue, {
    unwatched() {
      if (dispose) {
        dispose();
        dispose = undefined;
      }
    },
    watched() {
      dispose = register(this);
    },
  });
}
