/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// Create messaging connection to send editorState updates to Lexical DevTools App.
// Each tab will have a separate messaging port for the devTools app & the inspectedWindow's content script, eg. { tabId: { reactPort, contentScriptPort } }
const tabsToPorts: Record<
  number,
  {contentScriptPort?: chrome.runtime.Port; reactPort?: chrome.runtime.Port}
> = {};

// The Lexical DevTools React UI sends a message to initialize the port.
chrome.runtime.onConnect.addListener((port: chrome.runtime.Port) => {
  port.onMessage.addListener((message) => {
    if (!port.sender || !port.sender.tab) {
      return;
    }

    const tabId = port.sender.tab.id;

    if (!tabId) {
      return;
    }

    if (message.name === 'init' && message.type === 'FROM_APP') {
      tabsToPorts[message.tabId].reactPort = port;
      return;
    }

    if (message.name === 'init' && message.type === 'FROM_CONTENT') {
      tabsToPorts[tabId] = {};
      tabsToPorts[tabId].contentScriptPort = port;
      return;
    }

    if (message.name === 'editor-update') {
      const reactPort = tabsToPorts[tabId].reactPort;
      if (reactPort) {
        reactPort.postMessage({
          editorState: message.editorState,
        });
      }
    }
  });
});
