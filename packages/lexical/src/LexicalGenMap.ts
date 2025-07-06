/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import invariant from 'shared/invariant';

const TOMBSTONE = null;

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
export class GenMap<K, V> {
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
  constructor(prev?: GenMap<K, V>) {
    if (prev) {
      invariant(prev instanceof GenMap, '!prev instanceof GenMap');
      prev._mutable = false;
      this._old = prev._old;
      this._nursery = prev._nursery;
      this._size = prev._size;
    }
  }
  clone(): GenMap<K, V> {
    return new GenMap(this);
  }
  get size() {
    return this._size;
  }
  has(key: K): boolean {
    return this.get(key) !== undefined;
  }
  get(key: K): undefined | V {
    if (this._nursery) {
      const v = this._nursery.get(key);
      if (v !== undefined) {
        return v === TOMBSTONE ? undefined : v;
      }
    }
    return this._old && this._old.get(key);
  }
  _getNursery() {
    if (!this._mutable) {
      // Run a compaction when the nursery is greater than half the size of the snapshot
      if (this._nursery) {
        if (this._nursery.size * 2 > this._size) {
          const compact = new Map(this._old);
          for (const [k, v] of this._nursery) {
            if (v !== TOMBSTONE) {
              compact.set(k, v);
            }
          }
          this._old = compact;
          this._nursery = undefined;
        } else {
          this._nursery = new Map(this._nursery);
        }
      }
      this._mutable = true;
    }
    if (!this._nursery) {
      this._nursery = new Map();
    }
    return this._nursery;
  }
  set(key: K, value: V): this {
    if (!this.has(key)) {
      this._size++;
    }
    this._getNursery().set(key, value);
    return this;
  }
  delete(key: K): boolean {
    const deleted = this.has(key);
    if (deleted) {
      this._getNursery().set(key, TOMBSTONE);
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
  *keys(): IterableIterator<K> {
    for (const [k, _v] of this.entries()) {
      yield k;
    }
  }
  *values(): IterableIterator<V> {
    for (const [_k, v] of this.entries()) {
      yield v;
    }
  }
  *entries(): IterableIterator<[K, V]> {
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
  [Symbol.iterator](): IterableIterator<[K, V]> {
    return this.entries();
  }
}
