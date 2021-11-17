/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {Controller} from 'outline-react/OutlineController';

import {createController} from 'outline-react/OutlineController';

// $FlowFixMe: should fix this;
type ListenerValue = any;

export type PlaygroundContext = {
  addListener(
    type: 'readonly' | 'clear',
    callback: (ListenerValue) => void,
  ): () => void,
  triggerListeners(type: 'readonly' | 'clear', value: ListenerValue): void,
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

function createPlaygroundContext(): PlaygroundContext {
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

const PlaygroundController: Controller<PlaygroundContext> =
  createController<PlaygroundContext>(createPlaygroundContext, config);

export default PlaygroundController;
