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

import {ElementPicker} from '../../element-picker';
import {readEditorState} from '../../lexicalForExtension';
import {deserializeEditorState} from '../../serializeEditorState';
import {ExtensionState} from '../../store';
import {SerializedRawEditorState} from '../../types';
import {isLexicalNode} from '../../utils/isLexicalNode';
import scanAndListenForEditors from './scanAndListenForEditors';
import {
  queryLexicalEditorByKey,
  queryLexicalNodeByKey,
} from './utils/queryLexicalByKey';

const ELEMENT_PICKER_STYLE = {borderColor: '#0000ff'};

export type IInjectedPegasusService = InstanceType<
  typeof InjectedPegasusService
>;

export class InjectedPegasusService
  implements IPegasusRPCService<InjectedPegasusService>
{
  private pickerActive: ElementPicker | null = null;

  constructor(
    private readonly tabID: number,
    private readonly extensionStore: StoreApi<ExtensionState>,
    private readonly commandLog: WeakMap<LexicalEditor, LexicalCommandLog>,
  ) {}

  refreshLexicalEditors() {
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

  toggleEditorPicker(): void {
    if (this.pickerActive != null) {
      this.pickerActive?.stop();
      this.pickerActive = null;

      return;
    }

    this.pickerActive = new ElementPicker({style: ELEMENT_PICKER_STYLE});
    this.pickerActive.start({
      elementFilter: (el) => {
        let parent: HTMLElement | null = el;
        while (parent != null && parent.tagName !== 'BODY') {
          if ('__lexicalEditor' in parent) {
            return parent;
          }
          parent = parent.parentElement;
        }

        return false;
      },

      onClick: (el) => {
        this.pickerActive?.stop();
        this.pickerActive = null;
        if (isLexicalNode(el)) {
          this.extensionStore
            .getState()
            .setSelectedEditorKey(this.tabID, el.__lexicalEditor.getKey());
        } else {
          console.warn('Selected Element is not a Lexical node');
        }
      },
    });
  }
}
