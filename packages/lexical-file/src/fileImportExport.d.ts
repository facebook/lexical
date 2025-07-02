/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { EditorState, LexicalEditor, SerializedEditorState } from 'lexical';
export interface SerializedDocument {
    /** The serialized editorState produced by editorState.toJSON() */
    editorState: SerializedEditorState;
    /** The time this document was created in epoch milliseconds (Date.now()) */
    lastSaved: number;
    /** The source of the document, defaults to Lexical */
    source: string | 'Lexical';
    /** The version of Lexical that produced this document */
    version: string;
}
/**
 * Generates a SerializedDocument from the given EditorState
 * @param editorState - the EditorState to serialize
 * @param config - An object that optionally contains source and lastSaved.
 * source defaults to Lexical and lastSaved defaults to the current time in
 * epoch milliseconds.
 */
export declare function serializedDocumentFromEditorState(editorState: EditorState, config?: Readonly<{
    source?: string;
    lastSaved?: number;
}>): SerializedDocument;
/**
 * Parse an EditorState from the given editor and document
 *
 * @param editor - The lexical editor
 * @param maybeStringifiedDocument - The contents of a .lexical file (as a JSON string, or already parsed)
 */
export declare function editorStateFromSerializedDocument(editor: LexicalEditor, maybeStringifiedDocument: SerializedDocument | string): EditorState;
/**
 * Takes a file and inputs its content into the editor state as an input field.
 * @param editor - The lexical editor.
 */
export declare function importFile(editor: LexicalEditor): void;
/**
 * Generates a .lexical file to be downloaded by the browser containing the current editor state.
 * @param editor - The lexical editor.
 * @param config - An object that optionally contains fileName and source. fileName defaults to
 * the current date (as a string) and source defaults to Lexical.
 */
export declare function exportFile(editor: LexicalEditor, config?: Readonly<{
    fileName?: string;
    source?: string;
}>): void;
//# sourceMappingURL=fileImportExport.d.ts.map