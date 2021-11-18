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
  id: string;

  get(editor: OutlineEditor): null | Data;
  set(data: Data): void;
  stringify(editor: OutlineEditor): null | string;
}

function isStringified(
  editorState: null | EditorState | string,
): boolean %checks {
  return typeof editorState === 'string';
}

export class EditorStateRef implements Ref<EditorState> {
  id: string;
  _type: 'editorstate';
  _editorState: null | EditorState | string;

  constructor(id: string, editorState: EditorState | string) {
    this.id = id;
    this._type = 'editorstate';
    this._editorState = editorState;
  }

  get(editor: OutlineEditor): null | EditorState {
    let editorState = this._editorState;
    if (isStringified(editorState)) {
      editorState = editor.parseEditorState(editorState);
      this._editorState = editorState;
    }
    return editorState;
  }

  set(editorState: EditorState): void {
    this._editorState = editorState;
  }

  stringify(editor: OutlineEditor): null | string {
    const editorState = this.get(editor);
    return editorState === null || isStringified(editorState)
      ? editorState
      : editorState.stringify();
  }
}

export function createEditorStateRef(
  id: string,
  editorState: EditorState | string,
): EditorStateRef {
  return new EditorStateRef(id, editorState);
}

export function isEditorStateRef(obj: ?EditorState): boolean %checks {
  return obj instanceof EditorStateRef;
}
