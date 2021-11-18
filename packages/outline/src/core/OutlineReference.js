/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineEditor} from './OutlineEditor';
import type {EditorState} from './OutlineEditorState';

export type OutlineRef = EditorStateRef;

export interface Ref<Data> {
  get(editor: OutlineEditor): null | Data;
  set(data: Data): void;
  stringify(editor: OutlineEditor): null | string;
}

function isStringified(editorState: EditorState | string): boolean %checks {
  return typeof editorState === 'string';
}

export class EditorStateRef implements Ref<EditorState> {
  _type: 'editorstate';
  _editorState: null | EditorState;
  _stringifiedEditorState: null | string;

  constructor(editorState: EditorState | string) {
    this._type = 'editorstate';
    this._editorState = isStringified(editorState) ? null : editorState;
    this._stringifiedEditorState = isStringified(editorState)
      ? editorState
      : null;
  }

  get(editor: OutlineEditor): null | EditorState {
    let editorState = this._editorState;
    if (editorState === null) {
      const stringifiedEditorState = this._stringifiedEditorState;
      if (stringifiedEditorState !== null) {
        editorState = editor.parseEditorState(stringifiedEditorState);
        this._editorState = editorState;
      }
    }
    return editorState;
  }

  set(editorState: EditorState): void {
    this._editorState = editorState;
  }

  stringify(editor: OutlineEditor): null | string {
    const editorState = this.get(editor);
    return editorState === null
      ? this._stringifiedEditorState
      : editorState.stringify();
  }
}

export function createEditorStateRef(
  editorState: EditorState | string,
): EditorStateRef {
  return new EditorStateRef(editorState);
}

export function isEditorStateRef(obj: ?EditorState): boolean %checks {
  return obj instanceof EditorStateRef;
}
