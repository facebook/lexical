/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
'use strict';

let ports = [];

// listener for messages from content scripts
function connected(port) {
  ports[port.sender.tab.id] = port;

  port.onMessage.addListener(function (message) {
    port.postMessage({editorState: message.editorState});
  });
}

// eslint-disable-next-line no-undef
chrome.runtime.onConnect.addListener(connected);
