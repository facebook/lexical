/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * turns
 *   { 'MUCH ERROR': '0', 'SUCH WRONG': '1' }
 * into
 *   { 0: 'MUCH ERROR', 1: 'SUCH WRONG' }
 *
 * @param {Record<string, string>} targetObj
 * @returns {Record<string, string>}
 */
export default function invertObject(targetObj) {
  /** @type {Record<string, string>} */
  const result = {};
  const mapKeys = Object.keys(targetObj);

  for (const originalKey of mapKeys) {
    const originalVal = targetObj[originalKey];

    result[originalVal] = originalKey;
  }

  return result;
}
