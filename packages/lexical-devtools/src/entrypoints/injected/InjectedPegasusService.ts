/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {generateContent, LexicalCommandLog} from '@lexical/devtools-core';
import {IPegasusRPCService, PegasusRPCMessage} from '@webext-pegasus/rpc';
import {LexicalEditor} from 'lexical';
import {StoreApi} from 'zustand';

import {readEditorState} from '../../lexicalForExtension';
import {deserializeEditorState} from '../../serializeEditorState';
import {ExtensionState} from '../../store';
import {SerializedRawEditorState} from '../../types';
import scanAndListenForEditors from './scanAndListenForEditors';
import {
  queryLexicalEditorByKey,
  queryLexicalNodeByKey,
} from './utils/queryLexicalByKey';

export type IInjectedPegasusService = InstanceType<
  typeof InjectedPegasusService
>;

export class InjectedPegasusService
  implements IPegasusRPCService<InjectedPegasusService>
{
  constructor(
    private readonly tabID: number,
    private readonly extensionStore: StoreApi<ExtensionState>,
    private readonly commandLog: WeakMap<LexicalEditor, LexicalCommandLog>,
  ) {}

  refreshLexicalEditorsForTabID() {
    scanAndListenForEditors(this.tabID, this.extensionStore, this.commandLog);
  }

  setEditorReadOnly(
    _message: PegasusRPCMessage,
    editorKey: string,
    isReadonly: boolean,
  ): void {
    const editorNode = queryLexicalNodeByKey(editorKey);
    if (editorNode == null) {
      throw new Error(`Can't find editor with key: ${editorKey}`);
    }

    editorNode.contentEditable = isReadonly ? 'false' : 'true';
  }

  generateTreeViewContent(
    _message: PegasusRPCMessage,
    editorKey: string,
    exportDOM: boolean,
  ): string {
    const editor = queryLexicalEditorByKey(editorKey);
    if (editor == null) {
      throw new Error(`Can't find editor with key: ${editorKey}`);
    }

    return readEditorState(editor, editor.getEditorState(), () =>
      generateContent(editor, this.commandLog.get(editor) ?? [], exportDOM),
    );
  }

  setEditorState(
    _message: PegasusRPCMessage,
    editorKey: string,
    editorState: SerializedRawEditorState,
  ): void {
    const editor = queryLexicalEditorByKey(editorKey);
    if (editor == null) {
      throw new Error(`Can't find editor with key: ${editorKey}`);
    }

    editor.setEditorState(deserializeEditorState(editorState));
  }
}
