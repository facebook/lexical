/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalEditor} from 'lexical';

import {LexicalCommandLog} from '@lexical/devtools-core';
import {registerRPCService} from '@webext-pegasus/rpc';
import {StoreApi} from 'zustand';

import {ExtensionState} from '../../store';
import {InjectedPegasusService} from './InjectedPegasusService';
import scanAndListenForEditors from './scanAndListenForEditors';

const commandLog = new WeakMap<LexicalEditor, LexicalCommandLog>();

export default async function main(
  tabID: number,
  extensionStore: StoreApi<ExtensionState>,
) {
  registerRPCService(
    'InjectedPegasusService',
    new InjectedPegasusService(tabID, extensionStore, commandLog),
  );

  scanAndListenForEditors(tabID, extensionStore, commandLog);
}
