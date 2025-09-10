/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

export class BiMultiMap<K, V> {
  private keyToValues = new Map<K, Set<V>>();
  private valueToKey = new Map<V, K>();

  /**
   * Associates a value with a key. If the value was previously associated
   * with a different key, it will be removed from that key first.
   */
  put(key: K, value: V): void {
    // If this value is already associated with a different key, remove it
    const existingKey = this.valueToKey.get(value);
    if (existingKey !== undefined && existingKey !== key) {
      this.removeValue(existingKey, value);
    }

    // Add the key-value association
    if (!this.keyToValues.has(key)) {
      this.keyToValues.set(key, new Set<V>());
    }
    this.keyToValues.get(key)!.add(value);
    this.valueToKey.set(value, key);
  }

  putAll(key: K, values: Array<V>): void {
    for (const value of values) {
      this.put(key, value);
    }
  }

  /**
   * Gets all values associated with a key.
   * Returns an empty Set if the key doesn't exist.
   */
  get(key: K): Set<V> {
    const values = this.keyToValues.get(key);
    return values ? new Set(values) : new Set<V>();
  }

  /**
   * Gets the key associated with a value.
   * Returns undefined if the value doesn't exist.
   */
  getKey(value: V): K | undefined {
    return this.valueToKey.get(value);
  }

  /**
   * Checks if a key exists in the map.
   */
  hasKey(key: K): boolean {
    return this.keyToValues.has(key);
  }

  /**
   * Checks if a value exists in the map.
   */
  hasValue(value: V): boolean {
    return this.valueToKey.has(value);
  }

  /**
   * Checks if a specific key-value pair exists.
   */
  has(key: K, value: V): boolean {
    const values = this.keyToValues.get(key);
    return values ? values.has(value) : false;
  }

  /**
   * Removes all values associated with a key.
   * Returns true if the key existed and was removed.
   */
  removeKey(key: K): boolean {
    const values = this.keyToValues.get(key);
    if (!values) {
      return false;
    }

    // Remove all value-to-key mappings
    for (const value of values) {
      this.valueToKey.delete(value);
    }

    // Remove the key
    this.keyToValues.delete(key);
    return true;
  }

  /**
   * Removes a value from wherever it exists.
   * Returns true if the value existed and was removed.
   */
  removeValue(key: K, value: V): boolean {
    const values = this.keyToValues.get(key);
    if (!values || !values.has(value)) {
      return false;
    }

    values.delete(value);
    this.valueToKey.delete(value);

    // If this was the last value for the key, remove the key entirely
    if (values.size === 0) {
      this.keyToValues.delete(key);
    }

    return true;
  }

  /**
   * Gets all keys in the map.
   */
  keys(): Set<K> {
    return new Set(this.keyToValues.keys());
  }

  /**
   * Gets all values in the map.
   */
  values(): Set<V> {
    return new Set(this.valueToKey.keys());
  }

  /**
   * Gets all key-value pairs as an array of [key, value] tuples.
   */
  entries(): [K, V][] {
    const result: [K, V][] = [];
    for (const [key, values] of this.keyToValues) {
      for (const value of values) {
        result.push([key, value]);
      }
    }
    return result;
  }

  /**
   * Returns the number of key-value pairs in the map.
   */
  get size(): number {
    return this.valueToKey.size;
  }

  /**
   * Returns the number of unique keys in the map.
   */
  get keyCount(): number {
    return this.keyToValues.size;
  }

  /**
   * Removes all entries from the map.
   */
  clear(): void {
    this.keyToValues.clear();
    this.valueToKey.clear();
  }

  /**
   * Returns true if the map is empty.
   */
  get isEmpty(): boolean {
    return this.size === 0;
  }
}
