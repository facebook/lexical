/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  createNodeTreeFromLexicalNode,
  generateContent,
  getTreeNodePropDetails,
  LexicalCommandLog,
  prepareEditorSelection,
} from '@lexical/devtools-core';
import {IPegasusRPCService, PegasusRPCMessage} from '@webext-pegasus/rpc';
import {LexicalEditor} from 'lexical';
import {flattenTree, INode} from 'react-accessible-treeview';
import {StoreApi} from 'zustand';

import {NodeOverlay} from '../../components/NodeOverlay';
import {ElementPicker} from '../../element-picker';
import {$getRoot, readEditorState} from '../../lexicalForExtension';
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
  private nodeOverlay: NodeOverlay | null = null;

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
    if (this.pickerActive !== null) {
      this.deactivatePicker();
    } else {
      this.activatePicker();
    }
  }

  /**
   * Generates content for a collapsible tree view
   * @param _message
   * @param editorKey
   * @param exportDOM
   * @returns string
   */
  generateTreeViewNodes(
    _message: PegasusRPCMessage,
    editorKey: string,
  ): string {
    const editor = queryLexicalEditorByKey(editorKey);
    if (editor == null) {
      throw new Error(`Can't find editor with key: ${editorKey}`);
    }

    return readEditorState(editor, editor.getEditorState(), () => {
      const editorState = editor.getEditorState();
      return editorState.read(() => {
        const initialNode = {
          children: [createNodeTreeFromLexicalNode($getRoot())],
          name: '',
        };
        return JSON.stringify({
          selection: prepareEditorSelection(editorState),
          tree: flattenTree(initialNode),
        });
      });
    });
  }

  /**
   * Highlights a node in the editor
   * @param _message
   * @param editorKey
   * @param element
   * @param isSelected
   * @returns
   */
  highlightEditorNode(
    _message: PegasusRPCMessage,
    editorKey: string,
    element: INode,
    isSelected: boolean,
  ): string | null {
    const editor = queryLexicalEditorByKey(editorKey);
    if (editor == null) {
      throw new Error(`Can't find editor with key: ${editorKey}`);
    }

    return readEditorState(editor, editor.getEditorState(), () => {
      const el = editor.getElementByKey(String(element.id));

      if (el != null && el.parentNode != null) {
        if (isSelected) {
          if (!this.nodeOverlay) {
            this.nodeOverlay = new NodeOverlay();
          }
          this.nodeOverlay.wrapElement(el, String(element.id));
          return getTreeNodePropDetails(editor, String(element.id));
        } else {
          this.nodeOverlay?.removeForElement(String(element.id));
        }
      }
      return null;
    });
  }

  clearHighlightEditorNode(
    _message: PegasusRPCMessage,
    editorKey: string,
  ): void {
    const editor = queryLexicalEditorByKey(editorKey);
    if (editor == null) {
      throw new Error(`Can't find editor with key: ${editorKey}`);
    }

    readEditorState(editor, editor.getEditorState(), () => {
      this.nodeOverlay?.remove();
      this.nodeOverlay = null;
    });
  }

  private activatePicker(): void {
    this.extensionStore.getState().setIsSelecting(this.tabID, true);

    this.pickerActive = new ElementPicker({style: ELEMENT_PICKER_STYLE});
    this.pickerActive.start({
      elementFilter: (el) => {
        let parent: HTMLElement | null = el;
        while (parent !== null && parent.tagName !== 'BODY') {
          if ('__lexicalEditor' in parent) {
            return parent;
          }
          parent = parent.parentElement;
        }

        return false;
      },

      onClick: (el) => {
        this.deactivatePicker();
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

  private deactivatePicker(): void {
    this.pickerActive?.stop();
    this.pickerActive = null;
    this.extensionStore.getState().setIsSelecting(this.tabID, false);
  }
}
