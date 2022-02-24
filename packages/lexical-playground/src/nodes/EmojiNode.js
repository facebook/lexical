/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {NodeKey, EditorConfig, LexicalNode} from 'lexical';

import {TextNode} from 'lexical';

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
    const dom = document.createElement('span');
    const inner = super.createDOM(config);
    dom.className = this.__className;
    inner.className = 'emoji-inner';
    dom.appendChild(inner);
    return dom;
  }

  updateDOM<EditorContext>(
    prevNode: TextNode,
    dom: HTMLElement,
    config: EditorConfig<EditorContext>,
  ): boolean {
    // $FlowFixMe: this will always be an element or null
    const inner: null | HTMLElement = dom.firstChild;
    if (inner === null) {
      return true;
    }
    super.updateDOM(prevNode, inner, config);
    return false;
  }
}

export function $isEmojiNode(node: ?LexicalNode): boolean %checks {
  return node instanceof EmojiNode;
}

export function $createEmojiNode(
  className: string,
  emojiText: string,
): EmojiNode {
  return new EmojiNode(className, emojiText).setMode('token');
}
