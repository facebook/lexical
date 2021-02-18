/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

export const emptyFunction = () => {};

let keyCounter = 0;

// inviariant(condition, message) will refine types based on "condition", and
// if "condition" is false will throw an error. This function is special-cased
// in flow itself, so we can't name it anything else.
export function invariant(cond: boolean, message: string) {
  if (!cond) {
    const err = new Error(message);
    err.name = 'Invariant Violation';
    throw err;
  }
}

export function generateRandomKey(): string {
  return '_' + keyCounter++;
}

export const isArray = Array.isArray;
