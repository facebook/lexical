/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {Doc} from 'yjs';

import {createContext, useContext, useMemo} from 'react';
import devInvariant from 'shared/devInvariant';

export type CollaborationContextType = {
  color: string;
  isCollabActive: boolean;
  name: string;
  yjsDocMap: Map<string, Doc>;
};

const entries = [
  ['Cat', 'rgb(125, 50, 0)'],
  ['Dog', 'rgb(100, 0, 0)'],
  ['Rabbit', 'rgb(150, 0, 0)'],
  ['Frog', 'rgb(200, 0, 0)'],
  ['Fox', 'rgb(200, 75, 0)'],
  ['Hedgehog', 'rgb(0, 75, 0)'],
  ['Pigeon', 'rgb(0, 125, 0)'],
  ['Squirrel', 'rgb(75, 100, 0)'],
  ['Bear', 'rgb(125, 100, 0)'],
  ['Tiger', 'rgb(0, 0, 150)'],
  ['Leopard', 'rgb(0, 0, 200)'],
  ['Zebra', 'rgb(0, 0, 250)'],
  ['Wolf', 'rgb(0, 100, 150)'],
  ['Owl', 'rgb(0, 100, 100)'],
  ['Gull', 'rgb(100, 0, 100)'],
  ['Squid', 'rgb(150, 0, 150)'],
];

const randomEntry = entries[Math.floor(Math.random() * entries.length)];

export const CollaborationContext =
  createContext<CollaborationContextType | null>(null);

function newContext() {
  return {
    color: randomEntry[1],
    isCollabActive: false,
    name: randomEntry[0],
    yjsDocMap: new Map(),
  };
}

// This is here to help the transition post-#7818, however should be removed in a future release as
// a shared context across editors is likely to lead to bugs.
const UNSAFE_GLOBAL_CONTEXT = newContext();

export function LexicalCollaboration({children}: {children: React.ReactNode}) {
  const collabContext = useMemo(() => newContext(), []);

  return (
    <CollaborationContext.Provider value={collabContext}>
      {children}
    </CollaborationContext.Provider>
  );
}

export function useCollaborationContext(
  username?: string,
  color?: string,
): CollaborationContextType {
  let collabContext = useContext(CollaborationContext);
  devInvariant(
    collabContext != null,
    'useCollaborationContext: no context provider found',
  );

  collabContext = collabContext ?? UNSAFE_GLOBAL_CONTEXT;

  if (username != null) {
    collabContext.name = username;
  }

  if (color != null) {
    collabContext.color = color;
  }

  return collabContext;
}
