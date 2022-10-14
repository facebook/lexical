/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

export default function debounce<T = void>(
  fn: (props: T) => void,
  ms: number,
): (props: T, force?: boolean) => () => void {
  let timeout: null | number = null;
  return (props: T, force?: boolean) => {
    if (timeout !== null) {
      window.clearTimeout(timeout);
    }
    if (force === true) {
      fn(props);
    } else {
      timeout = window.setTimeout(() => fn(props), ms);
    }
    return () => {
      if (timeout !== null) {
        window.clearTimeout(timeout);
      }
    };
  };
}
