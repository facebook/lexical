/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

var lexical = require('lexical');

var version = "0.12.2";

/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

/**
 * Takes a file and inputs its content into the editor state as an input field.
 * @param editor - The lexical editor.
 */
function importFile(editor) {
  readTextFileFromSystem(text => {
    const json = JSON.parse(text);
    const editorState = editor.parseEditorState(JSON.stringify(json.editorState));
    editor.setEditorState(editorState);
    editor.dispatchCommand(lexical.CLEAR_HISTORY_COMMAND, undefined);
  });
}
function readTextFileFromSystem(callback) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.lexical';
  input.addEventListener('change', event => {
    const target = event.target;
    if (target.files) {
      const file = target.files[0];
      const reader = new FileReader();
      reader.readAsText(file, 'UTF-8');
      reader.onload = readerEvent => {
        if (readerEvent.target) {
          const content = readerEvent.target.result;
          callback(content);
        }
      };
    }
  });
  input.click();
}
/**
 * Generates a .lexical file to be downloaded by the browser containing the current editor state.
 * @param editor - The lexical editor.
 * @param config - An object that optionally contains fileName and source. fileName defaults to
 * the current date (as a string) and source defaults to lexical.
 */
function exportFile(editor, config = Object.freeze({})) {
  const now = new Date();
  const editorState = editor.getEditorState();
  const documentJSON = {
    editorState: editorState,
    lastSaved: now.getTime(),
    source: config.source || 'Lexical',
    version
  };
  const fileName = config.fileName || now.toISOString();
  exportBlob(documentJSON, `${fileName}.lexical`);
}

// Adapted from https://stackoverflow.com/a/19328891/2013580
function exportBlob(data, fileName) {
  const a = document.createElement('a');
  const body = document.body;
  if (body === null) {
    return;
  }
  body.appendChild(a);
  a.style.display = 'none';
  const json = JSON.stringify(data);
  const blob = new Blob([json], {
    type: 'octet/stream'
  });
  const url = window.URL.createObjectURL(blob);
  a.href = url;
  a.download = fileName;
  a.click();
  window.URL.revokeObjectURL(url);
  a.remove();
}

exports.exportFile = exportFile;
exports.importFile = importFile;
