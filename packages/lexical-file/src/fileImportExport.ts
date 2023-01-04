/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {EditorState, LexicalEditor} from 'lexical';

import {CLEAR_HISTORY_COMMAND} from 'lexical';

import {version} from '../package.json';

export function importFile(editor: LexicalEditor) {
  readTextFileFromSystem((text) => {
    const json = JSON.parse(text);
    const editorState = editor.parseEditorState(
      JSON.stringify(json.editorState),
    );
    editor.setEditorState(editorState);
    editor.dispatchCommand(CLEAR_HISTORY_COMMAND, undefined);
  });
}

function readTextFileFromSystem(callback: (text: string) => void) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.lexical';
  input.addEventListener('change', (event: Event) => {
    const target = event.target as HTMLInputElement;

    if (target.files) {
      const file = target.files[0];
      const reader = new FileReader();
      reader.readAsText(file, 'UTF-8');

      reader.onload = (readerEvent) => {
        if (readerEvent.target) {
          const content = readerEvent.target.result;
          callback(content as string);
        }
      };
    }
  });
  input.click();
}

type DocumentJSON = {
  editorState: EditorState;
  lastSaved: number;
  source: string | 'Lexical';
  version: typeof version;
};

export function exportFile(
  editor: LexicalEditor,
  config: Readonly<{
    fileName?: string;
    source?: string;
  }> = Object.freeze({}),
) {
  const now = new Date();
  const editorState = editor.getEditorState();
  const documentJSON: DocumentJSON = {
    editorState: editorState,
    lastSaved: now.getTime(),
    source: config.source || 'Lexical',
    version,
  };
  const fileName = config.fileName || now.toISOString();
  exportBlob(documentJSON, `${fileName}.lexical`);
}

// Adapted from https://stackoverflow.com/a/19328891/2013580
function exportBlob(data: DocumentJSON, fileName: string) {
  const a = document.createElement('a');
  const body = document.body;

  if (body === null) {
    return;
  }

  body.appendChild(a);
  a.style.display = 'none';
  const json = JSON.stringify(data);
  const blob = new Blob([json], {
    type: 'octet/stream',
  });
  const url = window.URL.createObjectURL(blob);
  a.href = url;
  a.download = fileName;
  a.click();
  window.URL.revokeObjectURL(url);
  a.remove();
}
