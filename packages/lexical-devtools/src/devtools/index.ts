/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
const port = chrome.runtime.connect();

// Create the panel which appears within the browser's DevTools, loading the Lexical DevTools App within index.html.
chrome.devtools.panels.create(
  'Lexical',
  '',
  '/src/panel/index.html',
  function (panel) {
    panel.onShown.addListener(handleShown);
    // to do: add handleHidden() listener
  },
);

function handleShown() {
  // init message goes → background script → content script
  // content script handles initial load of editorState
  port.postMessage({
    name: 'init',
    tabId: chrome.devtools.inspectedWindow.tabId,
    type: 'FROM_DEVTOOLS',
  });
}
