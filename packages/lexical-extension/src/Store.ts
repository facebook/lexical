/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
export type StoreSubscriber<T> = (value: T) => void;
export interface ReadableStore<T> {
  get: () => T;
  subscribe: (callback: StoreSubscriber<T>) => () => void;
}
export interface WritableStore<T> extends ReadableStore<T> {
  set: (value: T) => void;
}

export class Store<T> implements WritableStore<T>, Disposable {
  __value: T;
  __listeners: Map<symbol, StoreSubscriber<T>>;
  __eq?: (a: T, b: T) => boolean;
  constructor(value: T, eq?: (a: T, b: T) => boolean) {
    this.__value = value;
    this.__listeners = new Map();
    this.__eq = eq;
  }
  get() {
    return this.__value;
  }
  set(value: T): void {
    if (this.__eq ? !this.__eq(this.__value, value) : this.__value !== value) {
      this.__value = value;
      for (const cb of this.__listeners.values()) {
        cb(value);
      }
    }
  }
  [Symbol.dispose]() {
    this.dispose();
  }
  dispose() {
    this.__listeners.clear();
  }
  subscribe(
    callback: StoreSubscriber<T>,
    skipInitialization = false,
  ): () => void {
    const key = Symbol('unsubscribe');
    this.__listeners.set(key, callback);
    if (!skipInitialization) {
      callback(this.__value);
    }
    return () => {
      this.__listeners.delete(key);
    };
  }
}
