/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type { Binding, Provider, SyncCursorPositionsFn } from '@lexical/yjs';
import type { LexicalEditor } from 'lexical';
import type { JSX } from 'react';
import * as React from 'react';
import { Doc } from 'yjs';
import { InitialEditorStateType } from '../LexicalComposer';
export type CursorsContainerRef = React.MutableRefObject<HTMLElement | null>;
export declare function useYjsCollaboration(editor: LexicalEditor, id: string, provider: Provider, docMap: Map<string, Doc>, name: string, color: string, shouldBootstrap: boolean, binding: Binding, setDoc: React.Dispatch<React.SetStateAction<Doc | undefined>>, cursorsContainerRef?: CursorsContainerRef, initialEditorState?: InitialEditorStateType, awarenessData?: object, syncCursorPositionsFn?: SyncCursorPositionsFn): JSX.Element;
export declare function useYjsFocusTracking(editor: LexicalEditor, provider: Provider, name: string, color: string, awarenessData?: object): void;
export declare function useYjsHistory(editor: LexicalEditor, binding: Binding): () => void;
//# sourceMappingURL=useYjsCollaboration.d.ts.map