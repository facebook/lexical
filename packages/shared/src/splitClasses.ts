/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Takes a string of classNames and splits into an array of strings,
 * ignoring any empty strings.
 * eg. splitClasses('active small') will return ['active', 'small']
 * @param classNames - A string of class names
 * @returns An array of strings of class names
 */
export default function splitClasses(classNames: string): Array<string> {
  if (typeof classNames === 'string') {
    return classNames.split(/\s+/).filter((n) => n !== '');
  }
  return [];
}
