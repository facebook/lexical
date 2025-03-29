/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * If `!cond` throw in `__DEV__` like an invariant and warn in prod
 */
export default function devInvariant(
  cond?: boolean,
  message?: string,
  ...args: string[]
): void {
  if (cond) {
    return;
  }

  throw new Error(
    'Internal Lexical error: devInvariant() is meant to be replaced at compile ' +
      'time. There is no runtime version. Error: ' +
      message,
  );
}
