/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {isEqual} from 'lodash';
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
          const unsubscribeInjector = useExtensionStore.subscribe(
            (s) => s.devtoolsPanelLoadedForTabIDs,
            (devtoolsPanelLoadedForTabIDs) => {
              if (devtoolsPanelLoadedForTabIDs.includes(tabID)) {
                // for security reasons, content scripts cannot read Lexical's changes to the DOM
                // in order to access the editorState, we inject this script directly into the page
                // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_scripts#dom_access
                injectScript('/injected.js');
                try {
                  unsubscribeInjector();
                } catch {
                  /* If executed immediately - unsubscribeInjector may not be set yet */
                }
              }
            },
            {equalityFn: isEqual, fireImmediately: true},
          );
          ctx.onInvalidated(unsubscribeInjector);
        });
      })
      .catch(console.error);
  },
  matches: ['<all_urls>'],
  registration: 'manifest',
  runAt: 'document_start',
});
