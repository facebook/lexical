/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {initializeE2E} from '../utils';

describe('Flaky Test', () => {
  initializeE2E((e2e) => {
    // Note: this test is, itself, technically flaky but should pass 99.9% of the time (0.5^10)
    it('can handle a flaky test that fails 50% of the time', () => {
      const testValue = Math.floor(Math.random() * 2);
      expect(testValue).toBe(0);
    });
  });
});
