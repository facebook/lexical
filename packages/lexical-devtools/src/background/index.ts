/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// Create messaging connection to send editorState updates to Lexical DevTools App.
const ports = {}; // Each tab will have a separate messaging port for the devTools app & the inspectedWindow's content script, eg. { tabId: { reactPort, contentScriptPort } }

// The Lexical DevTools React UI sends a message to initialize the port.
chrome.runtime.onConnect.addListener(function (port) {
  port.onMessage.addListener((message) => {
    if (message.name === 'init' && message.type === 'FROM_APP') {
      ports[message.tabId].react = port;
      return;
    }

    if (message.name === 'init' && message.type === 'FROM_CONTENT') {
      ports[port.sender.tab.id] = {};
      ports[port.sender.tab.id].content = port;
      return;
    }

    if (message.name === 'editor-update') {
      const tabId = port.sender.tab.id;
      ports[tabId].react.postMessage({editorState: message.editorState});
    }
  });
});
