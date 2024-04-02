/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {StoreApi} from 'zustand';

const PORTNAME_PREFIX = `store-sync-`;

export default function getConfiguration<T>(store: StoreApi<T>) {
  const portName = PORTNAME_PREFIX + getStoreId(store);
  const serializer = (payload: unknown) => JSON.stringify(payload);
  const deserializer = (payload: string) => JSON.parse(payload);

  return {
    deserializer,
    portName,
    serializer,
  };
}

const getStoreId = (() => {
  let id = 0;
  const map = new WeakMap();

  return <T>(store: StoreApi<T>): number => {
    if (!map.has(store)) {
      map.set(store, ++id);
    }

    return map.get(store);
  };
})();
