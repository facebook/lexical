/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 *
 */
import type { AutoFormatTriggerState, ScanningContext } from './utils';
import type { DecoratorNode, EditorState, LexicalEditor } from 'lexical';
export declare function updateAutoFormatting<T>(editor: LexicalEditor, scanningContext: ScanningContext, createHorizontalRuleNode: () => DecoratorNode<T>): void;
export declare function getTriggerState(editorState: EditorState): null | AutoFormatTriggerState;
export declare function findScanningContext(editor: LexicalEditor, currentTriggerState: null | AutoFormatTriggerState, priorTriggerState: null | AutoFormatTriggerState): null | ScanningContext;
