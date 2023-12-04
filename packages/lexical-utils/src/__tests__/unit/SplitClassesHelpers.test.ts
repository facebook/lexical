/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {splitClasses} from '@lexical/utils';

describe('SplitClassesHelpers tests', () => {
  test('should split space-separated classes', () => {
    const result = splitClasses('class1 class2 class3');
    expect(result).toEqual(['class1', 'class2', 'class3']);
  });

  test('should handle leading and trailing spaces', () => {
    const result = splitClasses('  class1 class2  ');
    expect(result).toEqual(['class1', 'class2']);
  });

  test('should handle multiple spaces between classes', () => {
    const result = splitClasses('class1    class2');
    expect(result).toEqual(['class1', 'class2']);
  });

  test('should handle an empty string', () => {
    const result = splitClasses('');
    expect(result).toEqual([]);
  });

  test('should handle null or undefined input', () => {
    const resultNull = splitClasses(null);
    const resultUndefined = splitClasses(undefined);

    expect(resultNull).toEqual([]);
    expect(resultUndefined).toEqual([]);
  });

  test('should handle non-string input', () => {
    // skip type check for test cases
    const number = splitClasses(123 as unknown as string);
    const object = splitClasses({} as unknown as string);
    const array = splitClasses([] as unknown as string);
    const boolean = splitClasses(true as unknown as string);

    expect(number).toEqual([]);
    expect(object).toEqual([]);
    expect(array).toEqual([]);
    expect(boolean).toEqual([]);
  });
});
