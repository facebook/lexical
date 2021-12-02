/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import {createContext} from 'react';

// $FlowFixMe: should fix this;
type ListenerValue = any;

export type PlaygroundContext = {
  addListener(
    type: 'readonly' | 'clear' | 'connected' | 'connect',
    callback: (ListenerValue) => void,
  ): () => void,
  triggerListeners(
    type: 'readonly' | 'clear' | 'connect' | 'connected',
    value: ListenerValue,
  ): void,
};

export function createDefaultContext(): PlaygroundContext {
  const listeners = new Map();

  return {
    addListener(
      type: 'readonly' | 'clear' | 'connect' | 'connected',
      callback: (ListenerValue) => void,
    ): () => void {
      let set = listeners.get(type);
      if (set === undefined) {
        set = new Set();
        listeners.set(type, set);
      }
      const currentSet = set;
      currentSet.add(callback);
      return () => {
        currentSet.delete(callback);
      };
    },
    triggerListeners(
      type: 'readonly' | 'clear' | 'connect' | 'connected',
      value: ListenerValue,
    ): void {
      const set = listeners.get(type);
      if (set !== undefined) {
        const callbacks = Array.from(set);
        for (let i = 0; i < callbacks.length; i++) {
          callbacks[i](value);
        }
      }
    },
  };
}

export const PlaygroundEditorContext: React$Context<?PlaygroundContext> =
  createContext(null);
