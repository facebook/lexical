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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
chrome.runtime.onConnect.addListener(function (port: any) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  port.onMessage.addListener((message: any) => {
    if (message.name === 'init' && message.type === 'FROM_APP') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ports as any)[message.tabId].react = port;
      return;
    }

    if (message.name === 'init' && message.type === 'FROM_CONTENT') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ports as any)[port.sender.tab.id] = {};
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ports as any)[port.sender.tab.id].content = port;
      return;
    }

    if (message.name === 'editor-update') {
      const tabId = port.sender.tab.id;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (ports as any)[tabId].react.postMessage({
        editorState: message.editorState,
      });
    }
  });
});
