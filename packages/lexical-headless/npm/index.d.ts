/** @module @lexical/headless */
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { CreateEditorArgs, LexicalEditor } from 'lexical';
/**
 * Generates a headless editor that allows lexical to be used without the need for a DOM, eg in Node.js.
 * Throws an error when unsupported metehods are used.
 * @param editorConfig - The optional lexical editor configuration.
 * @returns - The configured headless editor.
 */
export declare function createHeadlessEditor(editorConfig?: CreateEditorArgs): LexicalEditor;
