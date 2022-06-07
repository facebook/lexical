/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
/// <reference types="react" />
import type { Provider } from '@lexical/yjs';
import type { Doc } from 'yjs';
declare type CollaborationContextType = {
    clientID: number;
    color: string;
    name: string;
    yjsDocMap: Map<string, Doc>;
};
export declare function CollaborationPlugin({ id, providerFactory, shouldBootstrap, username, }: {
    id: string;
    providerFactory: (id: string, yjsDocMap: Map<string, Doc>) => Provider;
    shouldBootstrap: boolean;
    username?: string;
}): JSX.Element;
export declare const CollaborationContext: React.Context<CollaborationContextType>;
export declare function useCollaborationContext(username?: string): CollaborationContextType;
export {};
