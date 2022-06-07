/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { EditorUpdateOptions, LexicalCommand, LexicalEditor, Transform } from './LexicalEditor';
import type { SerializedEditorState } from './LexicalEditorState';
import type { LexicalNode, SerializedLexicalNode } from './LexicalNode';
import { EditorState } from './LexicalEditorState';
export declare function isCurrentlyReadOnlyMode(): boolean;
export declare function errorOnReadOnly(): void;
export declare function errorOnInfiniteTransforms(): void;
export declare function getActiveEditorState(): EditorState;
export declare function getActiveEditor(): LexicalEditor;
export declare function $applyTransforms(editor: LexicalEditor, node: LexicalNode, transformsCache: Map<string, Array<Transform<LexicalNode>>>): void;
export declare function $parseSerializedNode(serializedNode: SerializedLexicalNode): LexicalNode;
export declare function parseEditorState(serializedEditorState: SerializedEditorState, editor: LexicalEditor, updateFn: void | (() => void)): EditorState;
export declare function readEditorState<V>(editorState: EditorState, callbackFn: () => V): V;
export declare function commitPendingUpdates(editor: LexicalEditor): void;
export declare function triggerListeners(type: 'update' | 'root' | 'decorator' | 'textcontent' | 'readonly', editor: LexicalEditor, isCurrentlyEnqueuingUpdates: boolean, ...payload: unknown[]): void;
export declare function triggerCommandListeners<P>(editor: LexicalEditor, type: LexicalCommand<P>, payload: P): boolean;
export declare function updateEditor(editor: LexicalEditor, updateFn: () => void, options?: EditorUpdateOptions): void;
