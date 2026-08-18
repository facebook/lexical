/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  EditorConfig,
  LexicalNode,
  NodeKey,
  SerializedPartial,
  SerializedTextNode,
  Spread,
} from 'lexical';

import {
  $applyNodeReplacement,
  objectValue,
  stringValue,
  TextNode,
} from 'lexical';

const emojiNodeSchema = objectValue({
  className: stringValue(),
});

const parseText = stringValue();

export type SerializedEmojiNode = Spread<
  {
    className: string;
  },
  SerializedTextNode
>;

export class EmojiNode extends TextNode {
  __className: string;

  static getType(): string {
    return 'emoji';
  }

  static clone(node: EmojiNode): EmojiNode {
    return new EmojiNode(node.__className, node.__text, node.__key);
  }

  constructor(className: string, text: string, key?: NodeKey) {
    super(text, key);
    this.__className = className;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = document.createElement('span');
    const inner = super.createDOM(config);
    dom.className = this.__className;
    inner.className = 'emoji-inner';
    dom.appendChild(inner);
    return dom;
  }

  updateDOM(prevNode: this, dom: HTMLElement, config: EditorConfig): boolean {
    const inner = dom.firstChild;
    if (inner === null) {
      return true;
    }
    super.updateDOM(prevNode, inner as HTMLElement, config);
    return false;
  }

  static importJSON(
    serializedNode: SerializedPartial<SerializedEmojiNode>,
  ): EmojiNode {
    const {className} = emojiNodeSchema(serializedNode);
    const text = parseText(serializedNode.text);
    return $createEmojiNode(className, text).updateFromJSON(serializedNode);
  }

  $config() {
    return this.config('emoji', {extends: TextNode, json: emojiNodeSchema});
  }

  exportJSON(): SerializedEmojiNode {
    return {
      ...super.exportJSON(),
      className: this.getClassName(),
    };
  }

  getClassName(): string {
    const self = this.getLatest();
    return self.__className;
  }
}

export function $isEmojiNode(
  node: LexicalNode | null | undefined,
): node is EmojiNode {
  return node instanceof EmojiNode;
}

export function $createEmojiNode(
  className: string,
  emojiText: string,
): EmojiNode {
  const node = new EmojiNode(className, emojiText).setMode('token');
  return $applyNodeReplacement(node);
}
