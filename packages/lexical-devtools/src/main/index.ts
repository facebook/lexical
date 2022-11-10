/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
let panelCreated = false;

const port = chrome.runtime.connect({
  name: 'devtools',
});

function syncSavedPreferences() {
  // TODO: Save devtools panel settings
}

syncSavedPreferences();

function createPanelIfLexicalLoaded() {
  if (panelCreated) {
    return;
  }

  chrome.devtools.inspectedWindow.eval(
    `window.document.querySelectorAll('div[data-lexical-editor]').length > 0`,
    function (pageHasLexical, error) {
      if (!pageHasLexical) {
        return;
      }

      panelCreated = true;

      clearInterval(loadCheckInterval);

      // Create the panel which appears within the browser devtools
      chrome.devtools.panels.create(
        'Lexical',
        '',
        'src/panel/index.html',
        function (panel) {
          panel.onShown.addListener(handleShown);
          // TODO: add handleHidden() listener
        },
      );
    },
  );
}

function handleShown() {
  // init message goes → background script → content script
  // content script handles initial load of editorState
  port.postMessage({
    name: 'init',
    tabId: chrome.devtools.inspectedWindow.tabId,
  });
}

// Load (or reload) the DevTools extension when the user navigates to a new page.
function checkPageForLexical() {
  syncSavedPreferences();
  createPanelIfLexicalLoaded();
}

// Check for Lexical before loading the DevTools extension when the user navigates to a new page.
chrome.devtools.network.onNavigated.addListener(checkPageForLexical);

// In case Lexical is added after page load
const loadCheckInterval = setInterval(function () {
  createPanelIfLexicalLoaded();
}, 1000);

createPanelIfLexicalLoaded();
