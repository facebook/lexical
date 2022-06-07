/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { LexicalEditor } from './LexicalEditor';
export declare function getIsProcesssingMutations(): boolean;
export declare function $flushMutations(editor: LexicalEditor, mutations: Array<MutationRecord>, observer: MutationObserver): void;
export declare function flushRootMutations(editor: LexicalEditor): void;
export declare function initMutationObserver(editor: LexicalEditor): void;
