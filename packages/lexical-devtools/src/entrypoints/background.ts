/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {CONTENT_SCRIPT_TAB_ID} from '@/messages';

import store from '../store';

export default defineBackground(() => {
  // eslint-disable-next-line no-console
  console.log('Hello from Lexical DevTools extension content script.', {
    id: browser.runtime.id,
  });

  // Store initialization so other extension surfaces can use it
  // as all changes go through background SW
  store.subscribe((_state) => {});

  browser.runtime.onMessage.addListener(
    (
      msg: CONTENT_SCRIPT_TAB_ID['message'],
      sender,
      sendResponse: CONTENT_SCRIPT_TAB_ID['sendResponse'],
    ) => {
      if (msg !== 'CONTENT_SCRIPT_TAB_ID') {
        return;
      }

      const tabID = sender.tab?.id;
      if (tabID !== undefined) {
        return sendResponse(tabID);
      } else {
        console.error("Can't identify tab ID for sender:", sender);
      }
    },
  );
});
