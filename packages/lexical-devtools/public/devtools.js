/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

'use strict';

// eslint-disable-next-line no-undef
chrome.devtools.panels.create('Lexical', 'favicon-32x32.png', '../index.html');

// devtools.inspectedWindow.eval() takes a script in the form of a string.
// browser extension content scripts don't have access to registerUpdateListener, so we use devtools.inspectedWindow.eval() instead.
// for more details:
//   https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_scripts
//   https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/devtools/inspectedWindow/eval
// eslint-disable-next-line no-undef
chrome.devtools.inspectedWindow
  // run editor.registerUpdateListener to subscribe to changes in editorState.
  // after the initial registration, editorState changes are sent to the background script via the page script from content.js, a safer form of communication
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
