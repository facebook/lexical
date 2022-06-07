/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
/// <reference types="react" />
import type { Binding, Provider } from '@lexical/yjs';
import type { LexicalEditor } from 'lexical';
import type { Doc } from 'yjs';
export declare function useYjsCollaboration(editor: LexicalEditor, id: string, provider: Provider, docMap: Map<string, Doc>, name: string, color: string, shouldBootstrap: boolean): [JSX.Element, Binding];
export declare function useYjsFocusTracking(editor: LexicalEditor, provider: Provider, name: string, color: string): void;
export declare function useYjsHistory(editor: LexicalEditor, binding: Binding): () => void;
