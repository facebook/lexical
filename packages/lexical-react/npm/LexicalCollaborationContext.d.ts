/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
/// <reference types="react" />
import type { Doc } from 'yjs';
type CollaborationContextType = {
    clientID: number;
    color: string;
    isCollabActive: boolean;
    name: string;
    yjsDocMap: Map<string, Doc>;
};
export declare const CollaborationContext: import("react").Context<CollaborationContextType>;
export declare function useCollaborationContext(username?: string, color?: string): CollaborationContextType;
export {};
