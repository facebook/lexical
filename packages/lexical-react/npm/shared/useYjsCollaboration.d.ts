/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { Binding, ExcludedProperties, Provider } from '@lexical/yjs';
import type { LexicalEditor } from 'lexical';
import * as React from 'react';
import { Doc } from 'yjs';
import { InitialEditorStateType } from '../LexicalComposer';
export type CursorsContainerRef = React.MutableRefObject<HTMLElement | null>;
export declare function useYjsCollaboration(editor: LexicalEditor, id: string, provider: Provider, docMap: Map<string, Doc>, name: string, color: string, shouldBootstrap: boolean, cursorsContainerRef?: CursorsContainerRef, initialEditorState?: InitialEditorStateType, excludedProperties?: ExcludedProperties, awarenessData?: object): [JSX.Element, Binding];
export declare function useYjsFocusTracking(editor: LexicalEditor, provider: Provider, name: string, color: string, awarenessData?: object): void;
export declare function useYjsHistory(editor: LexicalEditor, binding: Binding): () => void;
