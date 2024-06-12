/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {mergeRegister} from '@lexical/utils';

describe('mergeRegister', () => {
  it('calls all of the clean-up functions', () => {
    const cleanup = jest.fn();
    mergeRegister(cleanup, cleanup)();
    expect(cleanup).toHaveBeenCalledTimes(2);
  });
  it('calls the clean-up functions in reverse order', () => {
    const cleanup = jest.fn();
    mergeRegister(cleanup.bind(null, 1), cleanup.bind(null, 2))();
    expect(cleanup.mock.calls.map(([v]) => v)).toEqual([2, 1]);
  });
});
