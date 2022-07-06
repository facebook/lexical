/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

// Create the panel which appears within the browser's DevTools, loading the Lexical DevTools App within index.html.
// eslint-disable-next-line no-undef
chrome.devtools.panels.create('Lexical', 'favicon-32x32.png', '../index.html');

// Use devtools.inspectedWindow.eval() to get editorState updates. For more info on security concerns:
//   https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_scripts
//   https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/devtools/inspectedWindow/eval
// eslint-disable-next-line no-undef
chrome.devtools.inspectedWindow
  // Attach a registerUpdateListener within the window to subscribe to changes in editorState.
  // After the initial registration, all editorState updates are done via browser.runtime.onConnect & window.postMessage
  .eval(
    `
    const editor = document.querySelectorAll('div[data-lexical-editor]')[0]
      .__lexicalEditor;

    editor.registerUpdateListener(({editorState}) => {
      window.postMessage(
        {
          editorState,
          type: 'FROM_PAGE',
        },
        '*',
      );
    });
  `,
  ); // to do: add error handling eg. .then(handleError)
