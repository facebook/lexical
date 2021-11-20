/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {Doc} from 'yjs';

import {createContext, useContext} from 'react';

type CollaborationContextType = {
  yjsDocMap: Map<string, Doc>,
  name: string,
  color: string,
};

const colors = ['255,165,0', '0,200,55', '160,0,200', '0,172,200'];

export const CollaborationContext: React$Context<CollaborationContextType> =
  createContext({
    yjsDocMap: new Map(),
    name: 'Guest' + Math.floor(Math.random() * 100),
    color: colors[Math.floor(Math.random() * (colors.length - 1 - 0 + 1) + 0)],
  });

export function useCollaborationContext(): CollaborationContextType {
  return useContext(CollaborationContext);
}
