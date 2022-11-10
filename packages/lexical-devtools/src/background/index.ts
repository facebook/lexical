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
  {
    contentScriptPort?: chrome.runtime.Port;
    reactPort?: chrome.runtime.Port;
    devtoolsPort?: chrome.runtime.Port;
  }
> = {};

const IS_FIREFOX: boolean = navigator.userAgent.indexOf('Firefox') >= 0;

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

    if (message.name === 'init' && port.name === 'react-app') {
      tabsToPorts[tabId] = tabsToPorts[tabId] ? tabsToPorts[tabId] : {};
      tabsToPorts[message.tabId].reactPort = port;
      return;
    }

    if (message.name === 'init' && port.name === 'content-script') {
      tabsToPorts[tabId] = tabsToPorts[tabId] ? tabsToPorts[tabId] : {};
      tabsToPorts[tabId].contentScriptPort = port;
      port.postMessage({
        name: 'checkForLexical',
      });
      return;
    }

    if (message.name === 'lexical-found' && port.name === 'content-script') {
      setIconAndPopup('production', tabId);
    }

    if (message.name === 'init' && port.name === 'devtools') {
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

function isRestrictedBrowserPage(url: string | undefined) {
  return !url || new URL(url).protocol === 'chrome:';
}

function checkAndHandleRestrictedPageIfSo(tab: chrome.tabs.Tab) {
  if (tab && tab.id && isRestrictedBrowserPage(tab.url)) {
    setIconAndPopup('restricted', tab.id);
  }
}

if (!IS_FIREFOX) {
  chrome.tabs.query({}, (tabs) =>
    tabs.forEach(checkAndHandleRestrictedPageIfSo),
  );
  chrome.tabs.onCreated.addListener((tab: chrome.tabs.Tab) => {
    checkAndHandleRestrictedPageIfSo(tab);
  });
}

// Listen to URL changes on the active tab and update the DevTools icon.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (IS_FIREFOX) {
    // We don't properly detect protected URLs in Firefox at the moment.
    // However we can reset the DevTools icon to its loading state when the URL changes.
    // It will be updated to the correct icon by the onMessage callback below.
    if (tab.active && changeInfo.status === 'loading') {
      setIconAndPopup('disabled', tabId);
    }
  } else {
    // Don't reset the icon to the loading state for Chrome or Edge.
    // The onUpdated callback fires more frequently for these browsers,
    // often after onMessage has been called.
    checkAndHandleRestrictedPageIfSo(tab);
  }
});

function setIconAndPopup(lexicalBuildType: string, tabId: number) {
  chrome.browserAction.setIcon({
    path: {
      '128': 'icons/128-' + lexicalBuildType + '.png',
      '16': 'icons/16-' + lexicalBuildType + '.png',
      '32': 'icons/32-' + lexicalBuildType + '.png',
      '48': 'icons/48-' + lexicalBuildType + '.png',
    },
    tabId: tabId,
  });
  chrome.browserAction.setPopup({
    popup: 'popups/' + lexicalBuildType + '.html',
    tabId: tabId,
  });
}
