/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {Doc} from 'yjs';

import {createContext, useContext} from 'react';

type CollaborationContextType = {
  clientID: number;
  color: string;
  isCollabActive: boolean;
  name: string;
  yjsDocMap: Map<string, Doc>;
};

const entries = [
  ['Cat', '255,165,0'],
  ['Dog', '0,200,55'],
  ['Rabbit', '160,0,200'],
  ['Frog', '0,172,200'],
  ['Fox', '197,200,0'],
  ['Hedgehog', '31,200,0'],
  ['Pigeon', '200,0,0'],
  ['Squirrel', '200,0,148'],
  ['Bear', '255,235,0'],
  ['Tiger', '86,255,0'],
  ['Leopard', '0,255,208'],
  ['Zebra', '0,243,255'],
  ['Wolf', '0,102,255'],
  ['Owl', '147,0,255'],
  ['Gull', '255,0,153'],
  ['Squid', '0,220,255'],
];

const randomEntry = entries[Math.floor(Math.random() * entries.length)];
export const CollaborationContext = createContext<CollaborationContextType>({
  clientID: 0,
  color: randomEntry[1],
  isCollabActive: false,
  name: randomEntry[0],
  yjsDocMap: new Map(),
});

export function useCollaborationContext(
  username?: string,
): CollaborationContextType {
  const collabContext = useContext(CollaborationContext);

  if (username != null) {
    collabContext.name = username;
  }

  return collabContext;
}
