/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {allowWindowMessaging, sendMessage} from 'webext-bridge/content-script';

import useExtensionStore from '../../store';
import storeReadyPromise from '../../store-sync/content-script';
import injectScript from './injectScript';

export default defineContentScript({
  main(ctx) {
    allowWindowMessaging('lexical-extension');

    sendMessage('getTabID', null, 'background')
      .then((tabID) => {
        return storeReadyPromise(useExtensionStore).then(() => {
          injectScript('/injected.js');
        });
      })
      .catch(console.error);
  },
  matches: ['<all_urls>'],
  registration: 'manifest',
  runAt: 'document_end',
});
