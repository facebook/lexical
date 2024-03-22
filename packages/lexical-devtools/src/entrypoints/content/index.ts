/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {storeReadyPromise} from '../../store';
import injectScript from './injectScript';

export default defineContentScript({
  main() {
    // for security reasons, content scripts cannot read Lexical's changes to the DOM
    // in order to access the editorState, we inject this script directly into the page
    // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_scripts#dom_access
    injectScript('/injected.js');

    storeReadyPromise
      .then(() => {
        // eslint-disable-next-line no-console
        console.log(
          'Hello from Lexical DevTools extension content script.',
          window.location.protocol,
          browser.runtime,
        );
      })
      .catch(console.error);
  },
  matches: ['<all_urls>'],
  registration: 'manifest',
  runAt: 'document_start',
});
