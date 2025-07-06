/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

const TOMBSTONE = null;
const GEN_MAP_SIZE_THRESHOLD = 1000;

/**
 * Create a copy of the given Map or a copy-on-write GenMap based on the
 * minGenMapSize threshold.
 *
 * @param map A Map or GenMap
 * @param minGenMapSize The minimum threshold to use GenMap instead of a Map
 * @returns A copy of the Map or clone of the GenMap
 */
export function cloneMap<K, V>(
  map: Map<K, V>,
  minGenMapSize = GEN_MAP_SIZE_THRESHOLD,
): Map<K, V> {
  if (map.size < minGenMapSize) {
    return new Map(map);
  } else if (map instanceof GenMap) {
    return map.compact().clone();
  } else {
    const clone = new GenMap<K, V>().init(undefined, new Map(map), map.size);
    clone._mutable = true;
    return clone;
  }
}

/**
 * @internal
 */
export function genMapDiff<K, V>(
  prev: ReadonlyMap<K, V>,
  next: ReadonlyMap<K, V>,
): GenMap<K, V> {
  let clone: GenMap<K, V>;
  if (prev instanceof GenMap) {
    if (next instanceof GenMap && next._old === prev._old) {
      // No-op, these GenMap are already related
      next._mutable = false;
      return next;
    }
    clone = prev.clone();
  } else {
    clone = new GenMap<K, V>();
    clone._old = prev;
    clone._size = prev.size;
  }
  const seen = new Set<K>();
  for (const [k, v] of next.entries()) {
    clone.set(k, v);
    seen.add(k);
  }
  for (const k of prev.keys()) {
    if (!seen.has(k)) {
      clone.delete(k);
    }
  }
  return clone.compact();
}

/**
 * A Copy-on-write Map scheme suitable for NodeMap usage. Before it is
 * written to it merely points to the Maps from the previous GenMap. On first
 * write it will either do a compaction (create a new "_old" generation) or
 * create a copy of the "_nursery" from prev.
 *
 * This is an optimization as `new Map(oldMap)` must allocate some
 * constant factor of `oldMap.size` even if very few values are changing from
 * one state to the next.
 */
export class GenMap<K, V> implements Map<K, V> {
  /**
   * False if the GenMap is in its initial read-only state
   */
  _mutable: boolean = false;
  /**
   * A snapshot of the NodeMap when the last compaction occurred.
   */
  _old: undefined | ReadonlyMap<K, V> = undefined;
  /**
   * This Map represents any changes from `_old`, deletions that are present
   * in `_old` are marked with `TOMBSTONE`.
   */
  _nursery: undefined | Map<K, typeof TOMBSTONE | V> = undefined;
  /**
   * The current size of the Map, accounting for the various optimizations
   * used here.
   */
  _size: number = 0;
  clone(): GenMap<K, V> {
    this._mutable = false;
    return new GenMap<K, V>().init(this._old, this._nursery, this._size);
  }
  init(
    old: undefined | ReadonlyMap<K, V>,
    nursery: undefined | Map<K, typeof TOMBSTONE | V>,
    size: number,
  ): this {
    this._old = old;
    this._nursery = nursery;
    this._size = size;
    return this;
  }
  get size() {
    return this._size;
  }
  has(key: K): boolean {
    return this.get(key) !== undefined;
  }
  getWithTombstone(key: K): undefined | typeof TOMBSTONE | V {
    if (this._nursery) {
      const v = this._nursery.get(key);
      if (v !== undefined) {
        return v;
      }
    }
    return this._old && this._old.get(key);
  }
  get(key: K): undefined | V {
    const v = this.getWithTombstone(key);
    return v === TOMBSTONE ? undefined : v;
  }
  shouldCompact(): boolean {
    // Run a compaction when the nursery is greater than half the size
    // of the snapshot
    return this._nursery !== undefined && this._nursery.size * 2 > this._size;
  }
  getNursery() {
    if (!this._mutable || !this._nursery) {
      this._nursery = new Map(this._nursery);
      this._mutable = true;
    }
    return this._nursery;
  }
  compact(force = false): this {
    if (
      this._nursery &&
      this._nursery.size > 0 &&
      (force || this.shouldCompact())
    ) {
      const compact = new Map(this._old);
      for (const [k, v] of this._nursery) {
        if (v !== TOMBSTONE) {
          compact.set(k, v);
        } else {
          compact.delete(k);
        }
      }
      this._old = compact;
      this._nursery = undefined;
    }
    this._mutable = false;
    return this;
  }
  set(key: K, value: V): this {
    const v = this.getWithTombstone(key);
    if (v === value) {
      return this;
    }
    const nursery = this.getNursery();
    if (v === TOMBSTONE || v === undefined) {
      this._size++;
      // preserve iteration order
      if (v === TOMBSTONE) {
        nursery.delete(key);
      }
    }
    nursery.set(key, value);
    return this;
  }
  delete(key: K): boolean {
    const deleted = this.has(key);
    if (deleted) {
      // Note that if this key is resurrected, the iteration order
      // won't be strict insertion order. This should be fine for
      // our use case, key resurrection isn't something that should
      // happen often in Lexical and the iteration order isn't
      // particularly meaningful outside of tests
      this.getNursery().set(key, TOMBSTONE);
      this._size--;
    }
    return deleted;
  }
  clear(): void {
    this._mutable = false;
    this._old = undefined;
    this._nursery = undefined;
    this._size = 0;
  }
  *keys(): ReturnType<Map<K, V>['keys']> {
    for (const pair of this.entries()) {
      yield pair[0];
    }
  }
  *values(): ReturnType<Map<K, V>['values']> {
    for (const pair of this.entries()) {
      yield pair[1];
    }
  }
  *entries(): ReturnType<Map<K, V>['entries']> {
    const nursery = this._nursery;
    const old = this._old;
    // seen is used so we can provide the same ordered Map semantics from
    // the naive Map based NodeMap
    const seen = new Set<K>();
    if (old) {
      for (const pair of old) {
        const k = pair[0];
        const v = nursery ? nursery.get(k) : undefined;
        if (v !== undefined) {
          seen.add(k);
          if (v === TOMBSTONE) {
            continue;
          }
          pair[1] = v;
        }
        yield pair;
      }
    }
    if (nursery) {
      for (const pair of nursery) {
        if (!seen.has(pair[0]) && pair[1] !== TOMBSTONE) {
          yield pair as [K, V];
        }
      }
    }
  }
  forEach(
    callbackfn: (value: V, key: K, map: Map<K, V>) => void,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    thisArg?: any,
  ): void {
    if (thisArg !== undefined) {
      callbackfn = callbackfn.bind(thisArg);
    }
    for (const [k, v] of this.entries()) {
      callbackfn(v, k, this);
    }
  }
  get [Symbol.toStringTag](): string {
    return 'GenMap';
  }
  [Symbol.iterator](): ReturnType<Map<K, V>['entries']> {
    return this.entries();
  }
}
