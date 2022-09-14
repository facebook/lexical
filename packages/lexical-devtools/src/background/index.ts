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
    let tabId;

    if (port.sender && port.sender.tab) {
      tabId = port.sender.tab.id;
    } else if (message.tabId) {
      // in the DevTools React App, port.sender is undefined within FROM_APP messages
      // instead tabId is sent within message payload
      tabId = message.tabId;
    } else {
      return;
    }

    if (message.name === 'init' && message.type === 'FROM_APP') {
      tabsToPorts[tabId] = tabsToPorts[tabId] ? tabsToPorts[tabId] : {};
      tabsToPorts[message.tabId].reactPort = port;
      return;
    }

    if (message.name === 'init' && message.type === 'FROM_CONTENT') {
      tabsToPorts[tabId] = tabsToPorts[tabId] ? tabsToPorts[tabId] : {};
      tabsToPorts[tabId].contentScriptPort = port;
      return;
    }

    // initial editorState requested from devtools panel
    if (message.name === 'init' && message.type === 'FROM_DEVTOOLS') {
      const contentScriptPort = tabsToPorts[tabId].contentScriptPort;
      if (contentScriptPort) {
        contentScriptPort.postMessage({
          name: 'loadEditorState',
        });
      }
    }

    if (message.name === 'editor-update') {
      const reactPort = tabsToPorts[tabId].reactPort;
      if (reactPort) {
        reactPort.postMessage({
          editorState: message.editorState,
        });
      }
    }

    if (message.name === 'highlight' || message.name === 'dehighlight') {
      const contentScriptPort = tabsToPorts[tabId].contentScriptPort;
      if (contentScriptPort) {
        contentScriptPort.postMessage({
          lexicalKey: message.lexicalKey ? message.lexicalKey : null,
          name: message.name,
        });
      }
    }
  });
});
