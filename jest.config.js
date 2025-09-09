/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

const common = {
  modulePathIgnorePatterns: ['/npm'],
};

module.exports = {
  projects: [
    {
      ...common,
      displayName: 'integration',
      globalSetup: './scripts/__tests__/integration/setup.js',
      testMatch: ['**/scripts/__tests__/integration/**/*.test.js'],
    },
  ],
};
