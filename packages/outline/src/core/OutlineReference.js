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
  _type: string;

  get(editor: OutlineEditor): null | Data;
  set(data: Data): void;
  toJSON(): {type: string, editorState: null | string};
  isEmpty(): boolean;
}

function isStringified(
  editorState: null | EditorState | string,
): boolean %checks {
  return typeof editorState === 'string';
}

export class EditorStateRef implements Ref<EditorState> {
  id: string;
  _type: string;
  _editorState: null | EditorState | string;

  constructor(id: string, editorState: null | EditorState | string) {
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

  toJSON(): {id: string, type: string, editorState: null | string} {
    const editorState = this._editorState;
    return {
      id: this.id,
      type: this._type,
      editorState:
        editorState === null || isStringified(editorState)
          ? editorState
          : JSON.stringify(editorState.toJSON()),
    };
  }

  isEmpty(): boolean {
    return this._editorState === null;
  }
}

export function createEditorStateRef(
  id: string,
  editorState: null | EditorState | string,
): EditorStateRef {
  return new EditorStateRef(id, editorState);
}

export function isEditorStateRef(obj: ?EditorState): boolean %checks {
  return obj instanceof EditorStateRef;
}
