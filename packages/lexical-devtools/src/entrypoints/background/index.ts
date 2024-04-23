/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {registerRPCService} from '@webext-pegasus/rpc';
import {initPegasusTransport} from '@webext-pegasus/transport/background';

import {
  initExtensionStoreBackend,
  useExtensionStore as extensionStore,
} from '../../store.ts';
import ActionIconWatchdog from './ActionIconWatchdog.ts';
import {getTabIDService} from './getTabIDService';

export default defineBackground(() => {
  initPegasusTransport();
  // Way for content script & injected scripts to get their tab ID
  registerRPCService('getTabID', getTabIDService);

  // Store initialization so other extension surfaces can use it
  // as all changes go through background SW
  initExtensionStoreBackend();

  ActionIconWatchdog.start(extensionStore).catch(console.error);
});
