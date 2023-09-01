/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

var lexical = require('lexical');

/** @module @lexical/dragon */
function registerDragonSupport(editor) {
  const origin = window.location.origin;
  const handler = event => {
    if (event.origin !== origin) {
      return;
    }
    const rootElement = editor.getRootElement();
    if (document.activeElement !== rootElement) {
      return;
    }
    const data = event.data;
    if (typeof data === 'string') {
      let parsedData;
      try {
        parsedData = JSON.parse(data);
      } catch (e) {
        return;
      }
      if (parsedData && parsedData.protocol === 'nuanria_messaging' && parsedData.type === 'request') {
        const payload = parsedData.payload;
        if (payload && payload.functionId === 'makeChanges') {
          const args = payload.args;
          if (args) {
            const [elementStart, elementLength, text, selStart, selLength, formatCommand] = args;
            editor.update(() => {
              const selection = lexical.$getSelection();
              if (lexical.$isRangeSelection(selection)) {
                const anchor = selection.anchor;
                let anchorNode = anchor.getNode();
                let setSelStart = 0;
                let setSelEnd = 0;
                if (lexical.$isTextNode(anchorNode)) {
                  // set initial selection
                  if (elementStart >= 0 && elementLength >= 0) {
                    setSelStart = elementStart;
                    setSelEnd = elementStart + elementLength;
                    // If the offset is more than the end, make it the end
                    selection.setTextNodeRange(anchorNode, setSelStart, anchorNode, setSelEnd);
                  }
                }
                if (setSelStart !== setSelEnd || text !== '') {
                  selection.insertRawText(text);
                  anchorNode = anchor.getNode();
                }
                if (lexical.$isTextNode(anchorNode)) {
                  // set final selection
                  setSelStart = selStart;
                  setSelEnd = selStart + selLength;
                  const anchorNodeTextLength = anchorNode.getTextContentSize();
                  // If the offset is more than the end, make it the end
                  setSelStart = setSelStart > anchorNodeTextLength ? anchorNodeTextLength : setSelStart;
                  setSelEnd = setSelEnd > anchorNodeTextLength ? anchorNodeTextLength : setSelEnd;
                  selection.setTextNodeRange(anchorNode, setSelStart, anchorNode, setSelEnd);
                }

                // block the chrome extension from handling this event
                event.stopImmediatePropagation();
              }
            });
          }
        }
      }
    }
  };
  window.addEventListener('message', handler, true);
  return () => {
    window.removeEventListener('message', handler, true);
  };
}

exports.registerDragonSupport = registerDragonSupport;
