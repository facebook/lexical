/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {EditorConfig, NodeKey, SerializedTextNode, Spread} from 'lexical';

import {TextNode} from 'lexical';

export type SerializedEmojiNode = Spread<
  {
    unifiedID: string;
  },
  SerializedTextNode
>;

// @emoji-datasource-facebook is defined in vite.config.ts
const BASE_EMOJI_URI = new URL(`@emoji-datasource-facebook/`, import.meta.url)
  .href;

export class EmojiNode extends TextNode {
  __unifiedID: string;

  static getType(): string {
    return 'emoji';
  }

  static clone(node: EmojiNode): EmojiNode {
    return new EmojiNode(node.__unifiedID, node.__key);
  }

  constructor(unifiedID: string, key?: NodeKey) {
    const unicodeEmoji = String.fromCodePoint(
      ...unifiedID.split('-').map((v) => parseInt(v, 16)),
    );
    super(unicodeEmoji, key);

    this.__unifiedID = unifiedID.toLowerCase();
  }

  /**
   * DOM that will be rendered by browser within contenteditable
   * This is what Lexical renders
   */
  createDOM(_config: EditorConfig): HTMLElement {
    const dom = document.createElement('span');
    dom.className = 'emoji-node';
    dom.style.backgroundImage = `url('${BASE_EMOJI_URI}/${this.__unifiedID}.png')`;
    dom.innerText = this.__text;
    return dom;
  }

  static importJSON(serializedNode: SerializedEmojiNode): EmojiNode {
    return $createEmojiNode(serializedNode.unifiedID);
  }

  exportJSON(): SerializedEmojiNode {
    return {
      ...super.exportJSON(),
      type: 'emoji',
      unifiedID: this.__unifiedID,
    };
  }
}

export function $createEmojiNode(unifiedID: string): EmojiNode {
  const node = new EmojiNode(unifiedID)
    // In token mode node can be navigated through character-by-character,
    // but are deleted as a single entity (not invdividually by character).
    // This also forces Lexical to create adjacent TextNode on user input instead of
    // modifying Emoji node as it now acts as immutable node.
    .setMode('token');

  return node;
}
