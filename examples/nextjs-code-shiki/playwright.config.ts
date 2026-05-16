/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {PlaywrightTestConfig} from '@playwright/test';

const config: PlaywrightTestConfig = {
  testDir: 'tests',
  testMatch: /(.+\.)?(test|spec)\.[jt]s/,
  webServer: {
    command: 'pnpm run start',
    port: 3000,
  },
};

export default config;
