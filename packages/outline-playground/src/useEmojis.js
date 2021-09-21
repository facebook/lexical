/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {
  OutlineEditor,
  View,
  NodeKey,
  EditorConfig,
  Selection,
  ParsedTextNode,
} from 'outline';

import {useEffect} from 'react';
import {TextNode} from 'outline';

const emojis: {[string]: [string, string]} = {
  ':)': ['emoji happysmile', '🙂'],
  ':D': ['emoji veryhappysmile', '😀'],
  ':(': ['emoji unhappysmile', '🙁'],
  '<3': ['emoji heart', '❤'],
};

function findAndTransformEmoji(
  selection: null | Selection,
  node: TextNode,
): null | TextNode {
  const text = node.getTextContent();
  for (let i = 0; i < text.length; i++) {
    const possibleEmoji = text.slice(i, i + 2);
    const emojiData = emojis[possibleEmoji];

    if (emojiData !== undefined) {
      const [emojiStyle, emojiText] = emojiData;
      let targetNode;
      if (i === 0) {
        [targetNode] = node.splitText(i + 2);
      } else {
        [, targetNode] = node.splitText(i, i + 2);
      }
      const emojiNode = createEmojiNode(emojiStyle, emojiText);
      targetNode.replace(emojiNode);
      if (
        selection !== null &&
        (!selection.anchor.getNode().isAttached() ||
          !selection.focus.getNode().isAttached())
      ) {
        emojiNode.select();
      }
      return emojiNode;
    }
  }
  return null;
}

function textNodeTransform(node: TextNode, view: View): void {
  if (!node.isSimpleText()) {
    return;
  }

  const selection = view.getSelection();

  let targetNode = node;

  while (targetNode !== null) {
    targetNode = findAndTransformEmoji(selection, targetNode);
  }
}

export default function useEmojis(editor: OutlineEditor): void {
  useEffect(() => {
    editor.registerNodeType('emoji', EmojiNode);
    const removeTransform = editor.addTextNodeTransform(textNodeTransform);
    return () => {
      removeTransform();
    };
  }, [editor]);
}

export type ParsedEmojiNode = {
  ...ParsedTextNode,
  __className: string,
};

class EmojiNode extends TextNode {
  __className: string;

  static clone(node: EmojiNode): EmojiNode {
    return new EmojiNode(node.__className, node.__text, node.__key);
  }

  constructor(className: string, text: string, key: void | NodeKey) {
    super(text, key);
    this.__className = className;
    this.__type = 'emoji';
  }

  createDOM<EditorContext>(config: EditorConfig<EditorContext>) {
    const dom = super.createDOM(config);
    dom.className = this.__className;
    return dom;
  }
}

function createEmojiNode(className: string, emojiText: string): EmojiNode {
  return new EmojiNode(className, emojiText).makeImmutable();
}
