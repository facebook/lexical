/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
export function parseStringEnum<T extends string>(
  stringEnum: {[K in T]: K},
  value: string,
): T | undefined {
  return (stringEnum as Record<string, undefined | T>)[value];
}
