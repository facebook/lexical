/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {describe, expect, it} from 'vitest';

import {deepThemeMergeInPlace} from '../../deepThemeMergeInPlace';

describe('deepThemeMergeInPlace', () => {
  it('merges recursively', () => {
    const a = {a: 'a', nested: {a: 1}};
    const b = {b: 'b', nested: {b: 2}};
    const rval = deepThemeMergeInPlace(a, b);
    expect(a).toBe(rval);
    expect(a).toEqual({a: 'a', b: 'b', nested: {a: 1, b: 2}});
  });
});
