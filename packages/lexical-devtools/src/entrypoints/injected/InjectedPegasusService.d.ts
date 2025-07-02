/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { LexicalCommandLog } from '@lexical/devtools-core';
import { IPegasusRPCService, PegasusRPCMessage } from '@webext-pegasus/rpc';
import { LexicalEditor } from 'lexical';
import { StoreApi } from 'zustand';
import { ExtensionState } from '../../store';
import { SerializedRawEditorState } from '../../types';
export type IInjectedPegasusService = InstanceType<typeof InjectedPegasusService>;
export declare class InjectedPegasusService implements IPegasusRPCService<InjectedPegasusService> {
    private readonly tabID;
    private readonly extensionStore;
    private readonly commandLog;
    private pickerActive;
    constructor(tabID: number, extensionStore: StoreApi<ExtensionState>, commandLog: WeakMap<LexicalEditor, LexicalCommandLog>);
    refreshLexicalEditors(): void;
    setEditorReadOnly(_message: PegasusRPCMessage, editorKey: string, isReadonly: boolean): void;
    generateTreeViewContent(_message: PegasusRPCMessage, editorKey: string, exportDOM: boolean): string;
    setEditorState(_message: PegasusRPCMessage, editorKey: string, editorState: SerializedRawEditorState): void;
    toggleEditorPicker(): void;
    private activatePicker;
    private deactivatePicker;
}
//# sourceMappingURL=InjectedPegasusService.d.ts.map