/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {ClientIDRange} from './ClientID';
import type {Doc, Node as YNode} from '@y/y';

import {
  NodeStructureExtension,
  type ReadonlySignal,
  signal,
} from '@lexical/extension';
import invariant from '@lexical/internal/invariant';
import {
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_EDITOR,
  defineExtension,
  mergeRegister,
  REDO_COMMAND,
  safeCast,
  UNDO_COMMAND,
} from 'lexical';

import {YBinding, type YBindingStatus} from './Binding';

/** @experimental The configuration of {@link YCollabExtension}. */
export interface YCollabConfig {
  /** The shared document. Required. */
  doc: Doc | null;
  /** The shared root; defaults to `doc.get('lexical-y')`. */
  root: YNode | null;
  /**
   * Initialize as soon as the extension registers: use it when the document
   * is already synced (a headless writer, a converter, tests). Otherwise call
   * `binding.initialize()` after the provider's first sync.
   */
  synced: boolean;
  /** Undo capture timeout in ms; null disables collaborative undo. */
  captureTimeout: number | null;
  /** See YBindingOptions.clientIDRange (default 'uint53'). */
  clientIDRange: ClientIDRange;
  /**
   * See YBindingOptions.selfCheck; null keeps the default (off). Warnings
   * go to the editor's `onWarn`.
   */
  selfCheck: boolean | null;
  /** See YBindingOptions.selfCheckSample; null keeps the default (1). */
  selfCheckSample: number | null;
  /** See YBindingOptions.convert (default false). */
  convert: boolean;
}

/**
 * @experimental Binds the editor to a Yjs 14 document with the block-marker
 * layout, and provides collaborative undo (UNDO_COMMAND / REDO_COMMAND,
 * CAN_UNDO_COMMAND / CAN_REDO_COMMAND). Its output has the binding and a
 * `status` signal ('pending' until the layout record is read, then 'active'
 * or 'readonly'). It conflicts with the history extensions.
 */
export const YCollabExtension = defineExtension({
  build(editor, config) {
    invariant(config.doc !== null, '@lexical/y: YCollabExtension needs a doc');
    const status = signal<YBindingStatus>('pending');
    return {
      binding: new YBinding(editor, config.doc, {
        captureTimeout: config.captureTimeout,
        clientIDRange: config.clientIDRange,
        convert: config.convert,
        onStatus: value => {
          status.value = value;
        },
        root: config.root || undefined,
        selfCheck: config.selfCheck ?? undefined,
        selfCheckSample: config.selfCheckSample ?? undefined,
      }),
      status: status as ReadonlySignal<YBindingStatus>,
    };
  },
  config: safeCast<YCollabConfig>({
    captureTimeout: 500,
    clientIDRange: 'uint53',
    convert: false,
    doc: null,
    root: null,
    selfCheck: null,
    selfCheckSample: null,
    synced: false,
  }),
  conflictsWith: ['@lexical/history/History', '@lexical/history/SharedHistory'],
  // Every peer must hold the normalized tree the node declarations describe.
  dependencies: [NodeStructureExtension],
  name: '@lexical/y/Collab',
  register(editor, config, state) {
    const {binding} = state.getOutput();
    const stop = binding.start();
    const um = binding.undoManager;
    const update = () => {
      editor.dispatchCommand(CAN_UNDO_COMMAND, um !== null && um.canUndo());
      editor.dispatchCommand(CAN_REDO_COMMAND, um !== null && um.canRedo());
    };
    if (um !== null) {
      um.on('stack-item-added', update);
      um.on('stack-item-popped', update);
      um.on('stack-cleared', update);
    }
    update();
    if (config.synced) {
      binding.initialize();
    }
    return mergeRegister(
      editor.registerCommand(
        UNDO_COMMAND,
        () => {
          binding.undo();
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
      editor.registerCommand(
        REDO_COMMAND,
        () => {
          binding.redo();
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
      stop,
    );
  },
});
