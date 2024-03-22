/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {isEqual} from 'lodash';

import {Events} from '@/events';

import useExtensionStore, {storeReadyPromise} from '../../store';
import injectScript from './injectScript';

export default defineContentScript({
  main(ctx) {
    resolveTabID()
      .then((tabID) => {
        return storeReadyPromise.then(() => {
          document.addEventListener(
            Events.LEXICAL_EXT_COMM_REQ,
            function (evt) {
              const request = evt.detail;
              const response = {data: tabID, requestId: request.id};
              document.dispatchEvent(
                new CustomEvent(Events.LEXICAL_EXT_COMM_RES, {
                  detail: response,
                }),
              );
            },
            false,
          );

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

function resolveTabID(): Promise<number> {
  return browser.runtime.sendMessage('CONTENT_SCRIPT_TAB_ID');
}
