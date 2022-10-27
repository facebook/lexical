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
  ['Cat', 'rgb(255,165,0)'],
  ['Dog', 'rgb(0,200,55)'],
  ['Rabbit', 'rgb(160,0,200)'],
  ['Frog', 'rgb(0,172,200)'],
  ['Fox', 'rgb(197,200,0)'],
  ['Hedgehog', 'rgb(31,200,0)'],
  ['Pigeon', 'rgb(200,0,0)'],
  ['Squirrel', 'rgb(200,0,148)'],
  ['Bear', 'rgb(255,235,0)'],
  ['Tiger', 'rgb(86,255,0)'],
  ['Leopard', 'rgb(0,255,208)'],
  ['Zebra', 'rgb(0,243,255)'],
  ['Wolf', 'rgb(0,102,255)'],
  ['Owl', 'rgb(147,0,255)'],
  ['Gull', 'rgb(255,0,153)'],
  ['Squid', 'rgb(0,220,255)'],
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
  color?: string,
): CollaborationContextType {
  const collabContext = useContext(CollaborationContext);

  if (username != null) {
    collabContext.name = username;
  }

  if (color != null) {
    collabContext.color = color;
  }

  return collabContext;
}
