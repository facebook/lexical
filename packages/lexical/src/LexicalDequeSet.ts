/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
export class DequeSet<T> implements Iterable<T> {
  _front: Set<T> = new Set();
  _back: Set<T> = new Set();
  _cache?: T[];
  get size(): number {
    return this._front.size + this._back.size;
  }
  addBack(v: T): this {
    delete this._cache;
    if (!this._front.has(v)) {
      this._back.add(v);
    }
    return this;
  }
  addFront(v: T): this {
    delete this._cache;
    if (!this._back.has(v)) {
      this._front.add(v);
    }
    return this;
  }
  delete(v: T): boolean {
    delete this._cache;
    return this._front.delete(v) || this._back.delete(v);
  }
  toArray(): T[] {
    const arr = Array.from(this._front).reverse();
    for (const v of this._back) {
      arr.push(v);
    }
    return arr;
  }
  toReadonlyArray(): readonly T[] {
    this._cache = this._cache || this.toArray();
    return this._cache;
  }
  [Symbol.iterator](): IterableIterator<T> {
    return this.toReadonlyArray()[Symbol.iterator]();
  }
}
