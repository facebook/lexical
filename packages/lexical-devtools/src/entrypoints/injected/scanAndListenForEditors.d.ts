/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { LexicalEditor } from 'lexical';
import { LexicalCommandLog } from '@lexical/devtools-core';
import { StoreApi } from 'zustand';
import { ExtensionState } from '../../store';
export default function scanAndListenForEditors(tabID: number, extensionStore: StoreApi<ExtensionState>, commandLog: WeakMap<LexicalEditor, LexicalCommandLog>): void;
//# sourceMappingURL=scanAndListenForEditors.d.ts.map