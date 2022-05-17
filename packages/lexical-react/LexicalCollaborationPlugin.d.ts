/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {WebsocketProvider} from 'y-websocket';
import type {Doc, RelativePosition} from 'yjs';
export type UserState = {
  anchorPos: null | RelativePosition;
  focusPos: null | RelativePosition;
  name: string;
  color: string;
  focusing: boolean;
};
export type ProviderAwareness = {
  getLocalState: () => UserState;
  setLocalState: (arg0: UserState) => void;
  getStates: () => Array<UserState>;
  on: (type: 'update', cb: () => void) => void;
  off: (type: 'update', cb: () => void) => void;
};
type CollaborationContextType = {
  clientID: number;
  color: string;
  name: string;
  yjsDocMap: Map<string, Doc>;
};
export function CollaborationPlugin(arg0: {
  id: string;
  providerFactory(id: string, yjsDocMap: Map<string, Doc>): WebsocketProvider;
  shouldBootstrap: boolean;
  username?: string;
}): JSX.Element | null;
export declare var CollaborationContext: React.Context<CollaborationContextType>;
export function useCollaborationContext(): CollaborationContextType;
