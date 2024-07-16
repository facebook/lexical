/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor} from 'lexical';

import {
  LexicalCommandLog,
  registerLexicalCommandLogger,
} from '@lexical/devtools-core';
import {StoreApi} from 'zustand';

import {serializeEditorState} from '../../serializeEditorState';
import {ExtensionState} from '../../store';
import queryLexicalNodes from './utils/queryLexicalNodes';

export default function scanAndListenForEditors(
  tabID: number,
  extensionStore: StoreApi<ExtensionState>,
  commandLog: WeakMap<LexicalEditor, LexicalCommandLog>,
) {
  const {setStatesForTab, lexicalState} = extensionStore.getState();
  const states = lexicalState[tabID] ?? {};

  const editors = queryLexicalNodes().map((node) => node.__lexicalEditor);

  setStatesForTab(
    tabID,
    Object.fromEntries(
      editors.map((e) => {
        return [e._key, serializeEditorState(e.getEditorState())];
      }),
    ),
  );

  editors.forEach((editor) => {
    if (states[editor._key] !== undefined) {
      // already registered
      return;
    }
    editor.registerUpdateListener((event) => {
      const oldVal = extensionStore.getState().lexicalState[tabID];
      setStatesForTab(tabID, {
        ...oldVal,
        [editor._key]: serializeEditorState(event.editorState),
      });
    });
    // TODO: validate that this will be garbage collected when the editor node is destroyed
    registerLexicalCommandLogger(editor, (setter) => {
      const oldVal = commandLog.get(editor) ?? [];
      commandLog.set(editor, setter(oldVal));
    });
  });
}
