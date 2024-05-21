/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {EditorState, LexicalEditor, SerializedEditorState} from 'lexical';

import {CLEAR_HISTORY_COMMAND} from 'lexical';

import {version} from '../package.json';

export interface SerializedDocument {
  /** The serialized editorState produced by editorState.toJSON() */
  editorState: SerializedEditorState;
  /** The time this document was created in epoch milliseconds (Date.now()) */
  lastSaved: number;
  /** The source of the document, defaults to Lexical */
  source: string | 'Lexical';
  /** The version of Lexical that produced this document */
  version: string;
}

/**
 * Generates a SerializedDocument from the given EditorState
 * @param editorState - the EditorState to serialize
 * @param config - An object that optionally contains source and lastSaved.
 * source defaults to Lexical and lastSaved defaults to the current time in
 * epoch milliseconds.
 */
export function serializedDocumentFromEditorState(
  editorState: EditorState,
  config: Readonly<{
    source?: string;
    lastSaved?: number;
  }> = Object.freeze({}),
): SerializedDocument {
  return {
    editorState: editorState.toJSON(),
    lastSaved: config.lastSaved || Date.now(),
    source: config.source || 'Lexical',
    version,
  };
}

/**
 * Parse an EditorState from the given editor and document
 *
 * @param editor - The lexical editor
 * @param maybeStringifiedDocument - The contents of a .lexical file (as a JSON string, or already parsed)
 */
export function editorStateFromSerializedDocument(
  editor: LexicalEditor,
  maybeStringifiedDocument: SerializedDocument | string,
): EditorState {
  const json =
    typeof maybeStringifiedDocument === 'string'
      ? JSON.parse(maybeStringifiedDocument)
      : maybeStringifiedDocument;
  return editor.parseEditorState(json.editorState);
}

/**
 * Takes a file and inputs its content into the editor state as an input field.
 * @param editor - The lexical editor.
 */
export function importFile(editor: LexicalEditor) {
  readTextFileFromSystem((text) => {
    editor.setEditorState(editorStateFromSerializedDocument(editor, text));
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

/**
 * Generates a .lexical file to be downloaded by the browser containing the current editor state.
 * @param editor - The lexical editor.
 * @param config - An object that optionally contains fileName and source. fileName defaults to
 * the current date (as a string) and source defaults to Lexical.
 */
export function exportFile(
  editor: LexicalEditor,
  config: Readonly<{
    fileName?: string;
    source?: string;
  }> = Object.freeze({}),
) {
  const now = new Date();
  const serializedDocument = serializedDocumentFromEditorState(
    editor.getEditorState(),
    {
      ...config,
      lastSaved: now.getTime(),
    },
  );
  const fileName = config.fileName || now.toISOString();
  exportBlob(serializedDocument, `${fileName}.lexical`);
}

// Adapted from https://stackoverflow.com/a/19328891/2013580
function exportBlob(data: SerializedDocument, fileName: string) {
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
