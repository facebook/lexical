/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {EditorState, LexicalEditor} from 'lexical';

import {$createParagraphNode, $getRoot, $getSelection} from 'lexical';

export type InitialEditorStateType = null | string | EditorState | (() => void);

// Convoluted logic to make this work with Flow. Order matters.
const options = {tag: 'history-merge'};
const setEditorOptions: {
  tag?: string,
} = options;
const updateOptions: {
  onUpdate?: () => void,
  skipTransforms?: true,
  tag?: string,
} = options;

export function initializeEditor(
  editor: LexicalEditor,
  initialEditorState?: InitialEditorStateType,
): void {
  if (initialEditorState === null) {
    return;
  } else if (initialEditorState === undefined) {
    editor.update(() => {
      const root = $getRoot();
      const firstChild = root.getFirstChild();
      if (firstChild === null) {
        const paragraph = $createParagraphNode();
        root.append(paragraph);
        const activeElement = document.activeElement;
        if (
          $getSelection() !== null ||
          (activeElement !== null && activeElement === editor.getRootElement())
        ) {
          paragraph.select();
        }
      }
    }, updateOptions);
  } else if (initialEditorState !== null) {
    switch (typeof initialEditorState) {
      case 'string': {
        const parsedEditorState = editor.parseEditorState(initialEditorState);
        editor.setEditorState(parsedEditorState, setEditorOptions);
        break;
      }
      case 'object': {
        editor.setEditorState(initialEditorState, setEditorOptions);
        break;
      }
      case 'function': {
        editor.update(initialEditorState, updateOptions);
        break;
      }
    }
  }
}
