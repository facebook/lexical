/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { LexicalEditor, MutatedNodes } from './LexicalEditor';
import type { NodeKey } from './LexicalNode';
import { EditorState } from './LexicalEditorState';
type IntentionallyMarkedAsDirtyElement = boolean;
export declare function reconcileRoot(prevEditorState: EditorState, nextEditorState: EditorState, editor: LexicalEditor, dirtyType: 0 | 1 | 2, dirtyElements: Map<NodeKey, IntentionallyMarkedAsDirtyElement>, dirtyLeaves: Set<NodeKey>): MutatedNodes;
export declare function storeDOMWithKey(key: NodeKey, dom: HTMLElement, editor: LexicalEditor): void;
export {};
