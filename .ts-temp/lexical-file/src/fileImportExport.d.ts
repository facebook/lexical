/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { LexicalEditor } from 'lexical';
export declare function importFile(editor: LexicalEditor): void;
export declare function exportFile(editor: LexicalEditor, config?: Readonly<{
    fileName?: string;
    source?: string;
}>): void;
