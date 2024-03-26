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
  onMessage('getTabID', async (message) => {
    let tabID: number | undefined = message.sender.tabId;
    if (message.sender.context === 'popup') {
      tabID = (await browser.tabs.query({active: true, currentWindow: true}))[0]
        .id;
    }
    if (tabID === undefined) {
      throw new Error(
        `Could not get tab ID for message: ${message.toString()}`,
      );
    }
    return tabID;
  });

  // Store initialization so other extension surfaces can use it
  // as all changes go through background SW
  storeBackgroundWrapper(store);
});
