/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {IS_FIREFOX} from 'shared/environment';

// const CAN_USE_DOM =
//   typeof window !== 'undefined' &&
//   typeof window.document !== 'undefined' &&
//   typeof window.document.createElement !== 'undefined';
// const IS_FIREFOX =
//   CAN_USE_DOM && /^(?!.*Seamonkey)(?=.*Firefox).*/i.test(navigator.userAgent);

// for security reasons, content scripts cannot read Lexical's changes to the DOM
// in order to access the editorState, we inject this script directly into the page
const script = document.createElement('script');
script.src = chrome.runtime.getURL('inject.js');
document.documentElement.appendChild(script);
if (script.parentNode) script.parentNode.removeChild(script);

const port = chrome.runtime.connect();

port.postMessage({
  name: 'init',
  type: 'FROM_CONTENT',
});

// Listen to editorState updates from the inspected page, via the registerUpdateListener injected by devtools.js
window.addEventListener('message', function (event) {
  if (event.source !== window) {
    // Security check: https://developer.chrome.com/docs/extensions/mv3/content_scripts/#host-page-communication
    return;
  }

  if (
    event.data.type &&
    event.data.type === 'FROM_PAGE' &&
    event.data.name === 'editor-update'
  ) {
    port.postMessage({
      editorState: event.data.editorState,
      name: 'editor-update',
      type: 'FROM_CONTENT',
    });
  }
});

document.addEventListener('editorStateUpdate', function (e) {
  port.postMessage({
    editorState: e.detail.editorState,
    name: 'editor-update',
    type: 'FROM_CONTENT',
  });
});

port.onMessage.addListener((message) => {
  if (message.name === 'highlight') {
    const data = {lexicalKey: message.lexicalKey};
    const detail = IS_FIREFOX
      ? // eslint-disable-next-line no-undef
        cloneInto(data, document.defaultView) // see https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Sharing_objects_with_page_scripts#cloneinto
      : data;
    document.dispatchEvent(
      new CustomEvent('highlight', {
        detail,
      }),
    );
  }

  if (message.name === 'dehighlight') {
    document.dispatchEvent(new CustomEvent('dehighlight'));
  }

  if (message.name === 'loadEditorState') {
    document.dispatchEvent(new CustomEvent('loadEditorState'));
  }
});
