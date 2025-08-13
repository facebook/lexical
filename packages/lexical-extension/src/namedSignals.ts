/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {type Signal, signal} from './signals';

export type NamedSignalsOptions<Defaults> = {
  [K in keyof Defaults]?: Defaults[K];
};
export type NamedSignalsOutput<Defaults> = {
  [K in keyof Defaults]: Signal<Defaults[K]>;
};

export function namedSignals<Defaults>(
  defaults: Defaults,
  opts: NamedSignalsOptions<Defaults> = {},
): NamedSignalsOutput<Defaults> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const initial = {} as Record<keyof Defaults, Signal<any>>;
  for (const k in defaults) {
    const v = opts[k];
    const store = signal(v === undefined ? defaults[k] : v);
    initial[k] = store;
  }
  return initial;
}
