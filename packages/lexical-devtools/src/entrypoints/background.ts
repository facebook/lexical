/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {onMessage} from 'webext-bridge/background';

import store from '../store';
import storeBackgroundWrapper from '../store-sync/background';

export default defineBackground(() => {
  // Way for content script & injected scripts to get their tab ID
  onMessage('getTabID', (message) => {
    return message.sender.tabId;
  });

  // Store initialization so other extension surfaces can use it
  // as all changes go through background SW
  storeBackgroundWrapper(store);
});
