/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {CloneInto} from '../../types';

import {IS_FIREFOX} from 'shared/environment';

declare global {
  interface DocumentEventMap {
    editorStateUpdate: CustomEvent;
    highlight: CustomEvent;
    lexicalPresenceUpdate: CustomEvent;
  }
}

let backendDisconnected = false;
let backendInitialized = false;

// for security reasons, content scripts cannot read Lexical's changes to the DOM
// in order to access the editorState, we inject this script directly into the page
const script = document.createElement('script');
script.src = chrome.runtime.getURL('src/inject/index.js');
document.documentElement.appendChild(script);
if (script.parentNode) script.parentNode.removeChild(script);

const port = chrome.runtime.connect({
  name: 'content-script',
});

function sayHelloToBackend() {
  port.postMessage({
    name: 'init',
  });
}

document.addEventListener('lexicalPresenceUpdate', function (e) {
  if (e.detail.lexical) {
    port.postMessage({
      name: 'lexical-found',
    });
  }
});

document.addEventListener('editorStateUpdate', function (e) {
  port.postMessage({
    editorState: e.detail.editorState,
    name: 'editor-update',
  });
});

function getCloneInto(): CloneInto | null {
  // @ts-ignore
  if (typeof globalThis.cloneInto === 'function') {
    // @ts-ignore
    return globalThis.cloneInto;
  }
  return null;
}

const cloneInto = getCloneInto();

function handleDisconnect() {
  backendDisconnected = true;
  // TODO: remove event listeners and post shutdown message
}

port.onMessage.addListener((message) => {
  if (message.name === 'checkForLexical') {
    backendInitialized = true;
    // As we load scripts on document_end, we wait for the
    // page to load before dispatching checkForLexical event
    window.onload = function () {
      document.dispatchEvent(new CustomEvent('checkForLexical'));
    };
  }

  if (message.name === 'highlight') {
    const data = {lexicalKey: message.lexicalKey as string};
    const detail =
      IS_FIREFOX && cloneInto && document && document.defaultView
        ? cloneInto(data, document.defaultView)
        : data;
    document.dispatchEvent(
      new CustomEvent('highlight', {
        detail,
      }),
    );
  }

  if (message.name === 'dehighlight') {
    document.dispatchEvent(new CustomEvent('dehighlight'));
  }

  if (message.name === 'loadEditorState') {
    document.dispatchEvent(new CustomEvent('loadEditorState'));
  }
});
port.onDisconnect.addListener(handleDisconnect);

sayHelloToBackend();

if (!backendInitialized) {
  const intervalID = setInterval(() => {
    if (backendInitialized || backendDisconnected) {
      clearInterval(intervalID);
    } else {
      sayHelloToBackend();
    }
  }, 500);
}
