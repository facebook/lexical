/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
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
    args.reduce((msg, arg) => msg.replace('%s', String(arg)), message || ''),
  );
}
