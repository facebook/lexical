/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { LexicalEditor } from 'lexical';
/**
 * Takes a file and inputs its content into the editor state as an input field.
 * @param editor - The lexical editor.
 */
export declare function importFile(editor: LexicalEditor): void;
/**
 * Generates a .lexical file to be downloaded by the browser containing the current editor state.
 * @param editor - The lexical editor.
 * @param config - An object that optionally contains fileName and source. fileName defaults to
 * the current date (as a string) and source defaults to lexical.
 */
export declare function exportFile(editor: LexicalEditor, config?: Readonly<{
    fileName?: string;
    source?: string;
}>): void;
