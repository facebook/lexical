/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
const IS_FIREFOX = navigator.userAgent.indexOf('Firefox') >= 0;

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
    const nodeMap = IS_FIREFOX
      ? event.data.editorState._nodeMap
      : Object.fromEntries(event.data.editorState._nodeMap); // workaround, for some reason Object.fromEntries fails without console.error in Firefox
    port.postMessage({
      editorState: {nodeMap},
      name: 'editor-update',
      type: 'FROM_CONTENT',
    });
  }
});
