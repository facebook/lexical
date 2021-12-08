/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {NodeKey, EditorConfig, OutlineNode} from 'outline';

import {TextNode} from 'outline';

export class EmojiNode extends TextNode {
  __className: string;

  static getType(): string {
    return 'emoji';
  }

  static clone(node: EmojiNode): EmojiNode {
    return new EmojiNode(node.__className, node.__text, node.__key);
  }

  constructor(className: string, text: string, key: void | NodeKey) {
    super(text, key);
    this.__className = className;
  }

  createDOM<EditorContext>(config: EditorConfig<EditorContext>): HTMLElement {
    const dom = super.createDOM(config);
    dom.className = this.__className;
    return dom;
  }
}

export function isEmojiNode(node: OutlineNode): boolean %checks {
  return node instanceof EmojiNode;
}

export function $createEmojiNode(
  className: string,
  emojiText: string,
): EmojiNode {
  return new EmojiNode(className, emojiText).setMode('token');
}
