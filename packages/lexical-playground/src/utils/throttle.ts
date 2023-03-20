/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

export function throttle1<T1>(
  fn: (arg1: T1) => void,
  ms: number,
): [(arg1: T1) => void, () => void] {
  let intervalId: null | NodeJS.Timeout = null;
  let lastArgs: null | T1 = null;
  function handler() {
    if (lastArgs !== null) {
      fn(lastArgs);
    }
    intervalId = null;
  }
  return [
    (arg1: T1) => {
      lastArgs = arg1;
      if (intervalId === null) {
        intervalId = setTimeout(handler, ms);
      }
    },
    () => {
      if (intervalId !== null) {
        clearTimeout(intervalId);
      }
    },
  ];
}
