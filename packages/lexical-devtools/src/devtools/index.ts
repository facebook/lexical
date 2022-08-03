/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// Create the panel which appears within the browser's DevTools, loading the Lexical DevTools App within index.html.
chrome.devtools.panels.create(
  'Lexical',
  '/../../favicon-32x32.png',
  '/src/panel/index.html',
  function (panel) {
    panel.onShown.addListener(handleShown);
    // to do: add handleHidden() listener
  },
);

chrome.runtime.onConnect.addListener((port) => {
  port.onMessage.addListener((message) => {
    if (message.name === 'highlight') {
      chrome.devtools.inspectedWindow.eval(`
        highlight('${message.lexicalKey}');
      `);
    }

    if (message.name === 'dehighlight') {
      chrome.devtools.inspectedWindow.eval(`
        dehighlight();
      `);
    }
  });
});

function handleShown() {
  // Security concerns related to chrome.devtools.inspectedWindow.eval():
  //   https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Content_scripts
  //   https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/devtools/inspectedWindow/eval

  // query document for Lexical editor instance.
  // TODO: add support multiple Lexical editors within the same page
  // lexicalKey is attached to each DOM node like so: DOMNode[__lexicalKey_{editorKey}]
  chrome.devtools.inspectedWindow.eval(`
    const editorDOMNode = document.querySelectorAll(
      'div[data-lexical-editor]',
    )[0];
    const editor = editorDOMNode.__lexicalEditor;
    const editorKey = editorDOMNode.__lexicalEditor._key;
    const lexicalKey = '__lexicalKey_' + editorKey;
  `);

  // depth first search to find DOM node with lexicalKey
  chrome.devtools.inspectedWindow.eval(`
    const findDOMNode = (node, targetKey) => {
      if (targetKey === 'root') {
        return editorDOMNode;
      }

      if (node[lexicalKey] && node[lexicalKey] === targetKey) {
        return node;
      }
    
      for (let i = 0; i < node.childNodes.length; i++) {
        const child = findDOMNode(node.childNodes[i], targetKey);
        if (child) return child;
      }
    
      return null;
    };
  `);

  // functions to highlight/dehighlight DOM nodes onHover of DevTools nodes
  chrome.devtools.inspectedWindow.eval(`
    const highlight = (lexicalKey) => {
      const node = findDOMNode(editorDOMNode, lexicalKey);
      const {width, height, top, left} = node.getBoundingClientRect();
      highlightOverlay.style.width = width + 'px';
      highlightOverlay.style.height = height + 'px';
      highlightOverlay.style.top = top + window.scrollY + 'px';
      highlightOverlay.style.left = left + window.scrollX + 'px';
      highlightOverlay.style.display = 'block';
    };

    const dehighlight = () => {
      highlightOverlay.style.display = 'none';
    };
  `);

  // append highlight overlay <div> to document
  chrome.devtools.inspectedWindow.eval(`
    const highlightOverlay = document.createElement('div');
    highlightOverlay.style.position = 'absolute';
    highlightOverlay.style.background = 'rgba(119, 182, 255, 0.5)';
    highlightOverlay.style.border = '1px dashed #77b6ff';
    document.body.appendChild(highlightOverlay);
  `);

  // send initial editorState to devtools app through window.postMessage.
  // the existing editorState.toJSON() does not contain lexicalKey
  // therefore, we have a custom serializeEditorState helper
  chrome.devtools.inspectedWindow.eval(`
    const initialEditorState = editor.getEditorState();

    const serializeEditorState = (editorState) => {
      const nodeMap = Object.fromEntries(editorState._nodeMap);
      return {nodeMap};
    };

    window.postMessage(
      {
        editorState: serializeEditorState(initialEditorState),
        name: 'editor-update',
        type: 'FROM_PAGE',
      },
      '*',
    );
  `);

  // Attach a registerUpdateListener within the window to subscribe to changes in editorState.
  // After the initial registration, all editorState updates are done via browser.runtime.onConnect & window.postMessage
  chrome.devtools.inspectedWindow.eval(`
    editor.registerUpdateListener(({editorState}) => {
      window.postMessage(
        {
          editorState: serializeEditorState(editorState),
          name: 'editor-update',
          type: 'FROM_PAGE',
        },
        '*',
      );
    });
  `);
}
