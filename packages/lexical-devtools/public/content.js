/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
'use strict';

// open port to send/receive messages from background.js
// eslint-disable-next-line no-undef
let port = chrome.runtime.connect({name: 'lexical-devtools'});

port.onMessage.addListener(function (message) {
  // send message.editorState to app in main.tsx/App.tsx
});

// listen for messages from the page script in devtools.js
window.addEventListener('message', (event) => {
  // security workaround, see: https://developer.chrome.com/docs/extensions/mv3/content_scripts/#host-page-communication
  if (event.source !== window) {
    return;
  }

  // dispatch editorState to background.js
  if (event.data.type && event.data.type === 'FROM_PAGE') {
    port.postMessage({editorState: event.data.editorState._nodeMap}); // placeholder, sending _nodeMap for now because Chrome & Edge auto-serialize postMessages. so, sending the whole editorState throws a JSON serialization error
  }
});
