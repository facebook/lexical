/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {Controller} from 'outline-react/OutlineController';
import type {Doc} from 'yjs';

import {createController} from 'outline-react/OutlineController';

// $FlowFixMe: should fix this;
type ListenerValue = any;

export type PlaygroundState = {
  addListener(
    type: 'readonly' | 'clear',
    callback: (ListenerValue) => void,
  ): () => void,
  triggerListeners(type: 'readonly' | 'clear', value: ListenerValue): void,
};

export type PlaygroundSharedState = {
  yjsDocMap: Map<string, Doc>,
  name: string,
  color: string,
};

const config = {
  theme: {
    paragraph: 'editor-paragraph',
    quote: 'editor-quote',
    heading: {
      h1: 'editor-heading-h1',
      h2: 'editor-heading-h2',
      h3: 'editor-heading-h3',
      h4: 'editor-heading-h4',
      h5: 'editor-heading-h5',
    },
    list: {
      ol: 'editor-list-ol',
      ul: 'editor-list-ul',
    },
    nestedList: {
      list: 'editor-nested-list-list',
      listitem: 'editor-nested-list-listitem',
    },
    listitem: 'editor-listitem',
    image: 'editor-image',
    text: {
      bold: 'editor-text-bold',
      link: 'editor-text-link',
      italic: 'editor-text-italic',
      underline: 'editor-text-underline',
      strikethrough: 'editor-text-strikethrough',
      underlineStrikethrough: 'editor-text-underlineStrikethrough',
      code: 'editor-text-code',
    },
    hashtag: 'editor-text-hashtag',
    code: 'editor-code',
    link: 'editor-text-link',
    characterLimit: 'editor-character-limit',
  },
};

const colors = ['255,165,0', '0,200,55', '160,0,200', '0,172,200'];

function createPlaygroundState(): PlaygroundState {
  const listeners = new Map();

  return {
    addListener(
      type: 'readonly' | 'clear',
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
    triggerListeners(type: 'readonly' | 'clear', value: ListenerValue): void {
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

function createPlaygroundSharedState(): PlaygroundSharedState {
  return {
    yjsDocMap: new Map(),
    name: 'Guest' + Math.floor(Math.random() * 100),
    color: colors[Math.floor(Math.random() * (colors.length - 1 - 0 + 1) + 0)],
  };
}

const PlaygroundController: Controller<PlaygroundState, PlaygroundSharedState> =
  createController<PlaygroundState, PlaygroundSharedState>(
    createPlaygroundState,
    createPlaygroundSharedState,
    config,
  );

export default PlaygroundController;
