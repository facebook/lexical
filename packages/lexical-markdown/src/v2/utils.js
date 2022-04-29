/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

export function indexBy<T>(
  list: Array<T>,
  callback: (T) => string,
): $ReadOnly<{[string]: Array<T>}> {
  const index = {};
  for (const item of list) {
    const key = callback(item);
    if (index[key]) {
      index[key].push(item);
    } else {
      index[key] = [item];
    }
  }
  return index;
}
