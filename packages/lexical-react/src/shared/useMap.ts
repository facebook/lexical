/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {useRef} from 'react';

export function useMap<K, V>(initial?: Iterable<[K, V]>) {
  const mapRef = useRef<Map<K, V>>(new Map(initial));

  return {
    clear: () => mapRef.current.clear(),
    delete: (key: K) => mapRef.current.delete(key),
    entries: () => mapRef.current.entries(),
    get: (key: K) => mapRef.current.get(key),
    has: (key: K) => mapRef.current.has(key),
    keys: () => mapRef.current.keys(),
    raw: mapRef.current,
    set: (key: K, value: V) => mapRef.current.set(key, value),
    values: () => mapRef.current.values(),
  };
}

export function useWeakMap<K extends object, V>() {
  const weakMapRef = useRef<WeakMap<K, V>>(new WeakMap());

  return {
    delete: (key: K) => weakMapRef.current.delete(key),
    get: (key: K) => weakMapRef.current.get(key),
    has: (key: K) => weakMapRef.current.has(key),
    raw: weakMapRef.current,
    set: (key: K, value: V) => weakMapRef.current.set(key, value),
  };
}
