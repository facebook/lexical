/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor} from 'lexical';

import {generateContent, LexicalCommandLog} from '@lexical/devtools-core';
import {onMessage} from 'webext-bridge/window';
import {StoreApi} from 'zustand';

import {readEditorState} from '../../lexicalForExtension';
import {deserializeEditorState} from '../../serializeEditorState';
import {ExtensionState} from '../../store';
import scanAndListenForEditors from './scanAndListenForEditors';
import {
  queryLexicalEditorByKey,
  queryLexicalNodeByKey,
} from './utils/queryLexicalByKey';

const commandLog = new WeakMap<LexicalEditor, LexicalCommandLog>();

export default async function main(
  tabID: number,
  extensionStore: StoreApi<ExtensionState>,
) {
  onMessage('refreshLexicalEditorsForTabID', () =>
    scanAndListenForEditors(tabID, extensionStore, commandLog),
  );
  onMessage('generateTreeViewContent', (message) => {
    const editor = queryLexicalEditorByKey(message.data.key);
    if (editor == null) {
      throw new Error(`Can't find editor with key: ${message.data.key}`);
    }

    return readEditorState(editor, editor.getEditorState(), () =>
      generateContent(
        editor,
        commandLog.get(editor) ?? [],
        message.data.exportDOM,
      ),
    );
  });
  onMessage('setEditorState', (message) => {
    const editor = queryLexicalEditorByKey(message.data.key);
    if (editor == null) {
      throw new Error(`Can't find editor with key: ${message.data.key}`);
    }

    editor.setEditorState(deserializeEditorState(message.data.state));
  });
  onMessage('setEditorReadOnly', (message) => {
    const editorNode = queryLexicalNodeByKey(message.data.key);
    if (editorNode == null) {
      throw new Error(`Can't find editor with key: ${message.data.key}`);
    }

    editorNode.contentEditable = message.data.isReadonly ? 'false' : 'true';
  });

  scanAndListenForEditors(tabID, extensionStore, commandLog);
}
