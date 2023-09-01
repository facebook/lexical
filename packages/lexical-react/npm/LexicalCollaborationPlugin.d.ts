/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
/// <reference types="react" />
import type { Doc } from 'yjs';
import { ExcludedProperties, Provider } from '@lexical/yjs';
import { InitialEditorStateType } from './LexicalComposer';
import { CursorsContainerRef } from './shared/useYjsCollaboration';
type Props = {
    id: string;
    providerFactory: (id: string, yjsDocMap: Map<string, Doc>) => Provider;
    shouldBootstrap: boolean;
    username?: string;
    cursorColor?: string;
    cursorsContainerRef?: CursorsContainerRef;
    initialEditorState?: InitialEditorStateType;
    excludedProperties?: ExcludedProperties;
    awarenessData?: object;
};
export declare function CollaborationPlugin({ id, providerFactory, shouldBootstrap, username, cursorColor, cursorsContainerRef, initialEditorState, excludedProperties, awarenessData, }: Props): JSX.Element;
export {};
