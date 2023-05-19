/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

export function cache2Get<A, B, C>(
  cache: Map<A, Map<B, C>>,
  a: A,
  b: B,
): undefined | C {
  const nested = cache.get(a);
  if (nested !== undefined) {
    return nested.get(b);
  }
}

export function cache2Set<A, B, C>(
  cache: Map<A, Map<B, C>>,
  a: A,
  b: B,
  value: C,
): void {
  let nested = cache.get(a);
  if (nested === undefined) {
    nested = new Map<B, C>();
    cache.set(a, nested);
  }
  nested.set(b, value);
}
