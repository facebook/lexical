/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { EditorState, LexicalEditor } from 'lexical';
export type HistoryStateEntry = {
    editor: LexicalEditor;
    editorState: EditorState;
};
export type HistoryState = {
    current: null | HistoryStateEntry;
    redoStack: Array<HistoryStateEntry>;
    undoStack: Array<HistoryStateEntry>;
};
/**
 * Registers necessary listeners to manage undo/redo history stack and related editor commands.
 * It returns `unregister` callback that cleans up all listeners and should be called on editor unmount.
 * @param editor - The lexical editor.
 * @param historyState - The history state, containing the current state and the undo/redo stack.
 * @param delay - The time (in milliseconds) the editor should delay generating a new history stack,
 * instead of merging the current changes with the current stack.
 * @returns The listeners cleanup callback function.
 */
export declare function registerHistory(editor: LexicalEditor, historyState: HistoryState, delay: number): () => void;
/**
 * Creates an empty history state.
 * @returns - The empty history state, as an object.
 */
export declare function createEmptyHistoryState(): HistoryState;
//# sourceMappingURL=index.d.ts.map