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

export function initializeEditor(
  editor: LexicalEditor,
  initialEditorState?: InitialEditorStateType,
) {
  if (initialEditorState === undefined) {
    editor.update(
      () => {
        const root = $getRoot();
        const firstChild = root.getFirstChild();
        if (firstChild === null) {
          const paragraph = $createParagraphNode();
          root.append(paragraph);
          const activeElement = document.activeElement;
          if (
            $getSelection() !== null ||
            (activeElement !== null &&
              activeElement === editor.getRootElement())
          ) {
            paragraph.select();
          }
        }
      },
      {
        tag: 'history-merge',
      },
    );
  } else if (initialEditorState !== null) {
    switch (typeof initialEditorState) {
      case 'string': {
        const parsedEditorState = editor.parseEditorState(initialEditorState);
        editor.setEditorState(parsedEditorState, {
          tag: 'history-merge',
        });
        break;
      }
      case 'object': {
        editor.setEditorState(initialEditorState, {
          tag: 'history-merge',
        });
        break;
      }
      case 'function': {
        editor.update(initialEditorState, {
          tag: 'history-merge',
        });
        break;
      }
    }
  }
}
