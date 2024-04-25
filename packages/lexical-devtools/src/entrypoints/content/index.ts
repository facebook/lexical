/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {initPegasusTransport} from '@webext-pegasus/transport/content-script';

import {EXTENSION_NAME} from '../../constants';
import {extensionStoreReady} from '../../store.ts';
import injectScript from './injectScript';

export default defineContentScript({
  main(_ctx) {
    initPegasusTransport({allowWindowMessagingForNamespace: EXTENSION_NAME});

    // Init store for relay between injected script and the rest of the extension to work
    extensionStoreReady()
      .then(() => {
        injectScript('/injected.js');
      })
      .catch(console.error);
  },
  matches: ['<all_urls>'],
  registration: 'manifest',
  runAt: 'document_end',
});
