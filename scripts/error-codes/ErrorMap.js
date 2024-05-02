/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
'use strict';
// @ts-check

/**
 * Data structure to manage reading from and writing to codes.json
 */
class ErrorMap {
  /**
   * The map of error code numbers (as String(number)) to the error messages
   *
   * @type {Record<string, string>}
   */
  errorMap;
  /**
   * The map of error messages to the error code numbers (as integers)
   *
   * @type {Record<string, number}
   */
  inverseErrorMap = {};
  /**
   * The largest known error code presently in the errorMap
   * @type {number}
   */
  maxId = -1;
  /**
   * true if the errorMap has been updated but not yet flushed
   *
   * @type {boolean}
   */
  dirty = false;

  /**
   * @param {Record<string, string>} errorMap typically the result of `JSON.parse(fs.readFileSync('codes.json', 'utf8'))`
   * @param {(errorMap: Record<string, string>) => void} flushErrorMap the callback to persist the errorMap back to disk
   */
  constructor(errorMap, flushErrorMap) {
    this.errorMap = errorMap;
    this.flushErrorMap = flushErrorMap;
    for (const k in this.errorMap) {
      const id = parseInt(k, 10);
      this.inverseErrorMap[this.errorMap[k]] = id;
      this.maxId = id > this.maxId ? id : this.maxId;
    }
  }

  /**
   * Fetch the error code for a given error message. If the error message is
   * present in the errorMap, it will return the corresponding numeric code.
   *
   * If the message is not present, and extractCodes is not true, it will
   * return false.
   *
   * Otherwise, it will generate a new error code and queue a microtask to
   * flush it back to disk (so multiple updates can be batched together).
   *
   * @param {string} message the error message
   * @param {boolean} extractCodes true if we are also writing to codes.json
   * @returns {number | undefined}
   */
  getOrAddToErrorMap(message, extractCodes) {
    let id = this.inverseErrorMap[message];
    if (extractCodes && typeof id === 'undefined') {
      id = ++this.maxId;
      this.inverseErrorMap[message] = id;
      this.errorMap[`${id}`] = message;
      if (!this.dirty) {
        queueMicrotask(this.flush.bind(this));
        this.dirty = true;
      }
    }
    return id;
  }

  /**
   * If dirty is true, this will call flushErrorMap with the current errorMap
   * and reset dirty to false.
   *
   * Normally this is automatically queued to a microtask as necessary, but
   * it may be called manually in test scenarios.
   */
  flush() {
    if (this.dirty) {
      this.flushErrorMap(this.errorMap);
      this.dirty = false;
    }
  }
}

module.exports = ErrorMap;
