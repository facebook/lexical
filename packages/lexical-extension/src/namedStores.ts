/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {Store, type WritableStore} from './Store';

export type NamedStoresOptions<Defaults> = {
  [K in keyof Defaults]?: Defaults[K];
};
export type NamedStoresOutput<Defaults> = {
  [K in keyof Defaults]: WritableStore<Defaults[K]>;
};

export function namedStores<Defaults>(defaults: Defaults) {
  return (opts: NamedStoresOptions<Defaults>): NamedStoresOutput<Defaults> => {
    const initial = {} as {[K in keyof Defaults]: WritableStore<Defaults[K]>};
    for (const k in defaults) {
      const v = opts[k];
      initial[k] = new Store(v === undefined ? defaults[k] : v);
    }
    return initial;
  };
}
