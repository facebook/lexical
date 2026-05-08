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
 * Create a copy of the given Map, returning either a fresh Map or a clone
 * of a copy-on-write GenMap depending on the size threshold.
 *
 * Below the threshold the cost of `new Map(map)` is small enough that the
 * extra indirection of GenMap is not worthwhile. At and above the threshold
 * GenMap's O(1) clone wins.
 */
export function cloneMap<K, V>(
  map: Map<K, V>,
  minGenMapSize: number = GEN_MAP_SIZE_THRESHOLD,
): Map<K, V> {
  if (map.size < minGenMapSize) {
    return new Map(map);
  }
  if (map instanceof GenMap) {
    return map.clone();
  }
  const clone = new GenMap<K, V>();
  clone._old = new Map(map);
  clone._size = map.size;
  return clone;
}

/**
 * A copy-on-write Map suitable for cloning large collections cheaply.
 *
 * Before being written to, a GenMap shares its `_old` and `_nursery` Maps
 * with the GenMap it was cloned from. On first write it either compacts
 * (folds `_nursery` into a new `_old`) or shallow-copies `_nursery`,
 * isolating subsequent writes from sibling clones.
 *
 * `_old` is the immutable snapshot from the most recent compaction;
 * `_nursery` holds writes since the last compaction (deletions stored as
 * `TOMBSTONE`). `_mutable` tracks whether `_nursery` may be written to
 * directly or must first be cloned.
 */
export class GenMap<K, V> implements Map<K, V> {
  _mutable: boolean = false;
  _old: undefined | ReadonlyMap<K, V> = undefined;
  _nursery: undefined | Map<K, typeof TOMBSTONE | V> = undefined;
  _size: number = 0;

  clone(): GenMap<K, V> {
    this._mutable = false;
    const next = new GenMap<K, V>();
    next._old = this._old;
    next._nursery = this._nursery;
    next._size = this._size;
    return next;
  }

  get size(): number {
    return this._size;
  }

  has(key: K): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Returns the raw value for `key`, including TOMBSTONE for keys deleted
   * since the last compaction. Used internally to distinguish "missing"
   * from "deleted" without doing a second lookup.
   */
  getWithTombstone(key: K): undefined | typeof TOMBSTONE | V {
    const v = this._nursery && this._nursery.get(key);
    if (v !== undefined) {
      return v;
    }
    return this._old && this._old.get(key);
  }

  get(key: K): undefined | V {
    const v = this.getWithTombstone(key);
    return v === TOMBSTONE ? undefined : v;
  }

  shouldCompact(): boolean {
    return this._nursery !== undefined && this._nursery.size * 2 > this._size;
  }

  /**
   * Returns the nursery for in-place writes. If this GenMap is currently
   * sharing its nursery with an ancestor clone, this either compacts (if
   * the nursery has grown large enough) or makes a shallow copy.
   *
   * Skipping the `new Map()` allocation when the nursery is `undefined` or
   * empty saves ~5-10% on the typing path where most cycles start with no
   * pending writes.
   */
  getNursery(): Map<K, typeof TOMBSTONE | V> {
    if (!this._mutable || !this._nursery) {
      this.compact();
      if (this._nursery !== undefined && this._nursery.size > 0) {
        this._nursery = new Map(this._nursery);
      } else if (this._nursery === undefined) {
        this._nursery = new Map();
      }
      this._mutable = true;
    }
    return this._nursery;
  }

  /**
   * Fold the nursery into a new `_old` snapshot when it has grown large
   * enough that lookup overhead outweighs the savings from sharing.
   * Triggered automatically from `getNursery` once `_nursery.size * 2 >
   * _size`; can be forced via `compact(true)`.
   */
  compact(force: boolean = false): this {
    if (
      this._nursery &&
      this._nursery.size > 0 &&
      (force || this.shouldCompact())
    ) {
      const compact = new Map(this._old);
      for (const [k, v] of this._nursery) {
        if (v !== TOMBSTONE) {
          compact.set(k, v as V);
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
      if (v === TOMBSTONE) {
        // Preserve insertion order: clear the tombstone before re-setting.
        nursery.delete(key);
      }
    }
    nursery.set(key, value);
    return this;
  }

  delete(key: K): boolean {
    const deleted = this.has(key);
    if (deleted) {
      this.getNursery().set(key, TOMBSTONE);
      this._size--;
    }
    return deleted;
  }

  getOrInsert(key: K, defaultValue: V): V {
    const existing = this.get(key);
    if (existing !== undefined) {
      return existing;
    }
    this.set(key, defaultValue);
    return defaultValue;
  }

  getOrInsertComputed(key: K, computer: (k: K) => V): V {
    const existing = this.get(key);
    if (existing !== undefined) {
      return existing;
    }
    const value = computer(key);
    this.set(key, value);
    return value;
  }

  clear(): void {
    this._mutable = false;
    this._old = undefined;
    this._nursery = undefined;
    this._size = 0;
  }

  *keys(): MapIterator<K> {
    for (const pair of this.entries()) {
      yield pair[0];
    }
  }

  *values(): MapIterator<V> {
    for (const pair of this.entries()) {
      yield pair[1];
    }
  }

  *entries(): MapIterator<[K, V]> {
    const nursery = this._nursery;
    const old = this._old;
    if (old) {
      for (const pair of old) {
        const k = pair[0];
        const v = nursery ? nursery.get(k) : undefined;
        if (v === TOMBSTONE) {
          continue;
        } else if (v !== undefined) {
          (pair as [K, V])[1] = v as V;
        }
        yield pair as [K, V];
      }
    }
    if (nursery) {
      for (const pair of nursery) {
        if (pair[1] !== TOMBSTONE && !(old && old.has(pair[0]))) {
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

  [Symbol.iterator](): MapIterator<[K, V]> {
    return this.entries();
  }
}
