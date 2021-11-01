/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineEditor} from './OutlineEditor';
import type {NodeKey, NodeMap} from './OutlineNode';
import type {Selection} from './OutlineSelection';
import type {View} from './OutlineUpdates';
import type {ParsedNode} from './OutlineParsing';

import {createRootNode} from './OutlineRootNode';
import {readEditorState} from './OutlineUpdates';

export type ParsedEditorState = {
  _selection: null | {
    anchor: {
      key: string,
      offset: number,
      type: 'text' | 'block',
    },
    focus: {
      key: string,
      offset: number,
      type: 'text' | 'block',
    },
  },
  _nodeMap: Array<[NodeKey, ParsedNode]>,
};

export function editorStateHasDirtySelection(
  editorState: EditorState,
  editor: OutlineEditor,
): boolean {
  const currentSelection = editor.getEditorState()._selection;
  const pendingSelection = editorState._selection;
  // Check if we need to update because of changes in selection
  if (pendingSelection !== null) {
    if (pendingSelection.dirty || !pendingSelection.is(currentSelection)) {
      return true;
    }
  } else if (currentSelection !== null) {
    return true;
  }
  return false;
}

export function cloneEditorState(current: EditorState): EditorState {
  const draft = new EditorState(new Map(current._nodeMap));
  return draft;
}

export function createEmptyEditorState(): EditorState {
  return new EditorState(new Map([['root', createRootNode()]]));
}

export class EditorState {
  _nodeMap: NodeMap;
  _selection: null | Selection;
  _flushSync: boolean;
  _textContent: null | string;

  constructor(nodeMap: NodeMap) {
    this._nodeMap = nodeMap;
    this._selection = null;
    this._flushSync = false;
    this._textContent = null;
  }
  isEmpty(): boolean {
    return this._nodeMap.size === 1 && this._selection === null;
  }
  isBlank(isComposing: boolean, trim?: boolean = true): boolean {
    if (isComposing) {
      return false;
    }
    let text = this.getTextContent();
    if (trim) {
      text = text.trim();
    }
    return text === '';
  }
  read<V>(callbackFn: (view: View) => V): V {
    return readEditorState(this, callbackFn);
  }
  __getCachedTextContent(): null | string {
    return this._textContent;
  }
  getTextContent(): string {
    const cachedTextContent = this.__getCachedTextContent();
    if (cachedTextContent) {
      return cachedTextContent;
    }
    return this.read((view) => {
      const root = view.getRoot();
      return root.getTextContent();
    });
  }
  stringify(space?: string | number): string {
    const selection = this._selection;
    return JSON.stringify(
      {
        _nodeMap: Array.from(this._nodeMap.entries()),
        _selection:
          selection === null
            ? null
            : {
                anchor: {
                  key: selection.anchor.key,
                  offset: selection.anchor.offset,
                  type: selection.anchor.type,
                },
                focus: {
                  key: selection.focus.key,
                  offset: selection.focus.offset,
                  type: selection.focus.type,
                },
              },
      },
      null,
      space,
    );
  }
}
