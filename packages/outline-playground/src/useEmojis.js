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
  EditorThemeClasses,
  Selection,
  ParsedTextNode,
} from 'outline';

import {useEffect} from 'react';
import {TextNode, isTextNode} from 'outline';

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
      const nextSibling = emojiNode.getNextSibling();
      if (isTextNode(nextSibling)) {
        if (selection !== null && !selection.getAnchorNode().isAttached()) {
          nextSibling.select(0, 0);
        }
        return nextSibling;
      }
      break;
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

  constructor(className: string, text: string, key?: NodeKey) {
    super(text, key);
    this.__className = className;
    this.__type = 'emoji';
  }
  serialize(): ParsedEmojiNode {
    const {__className} = this;
    return {
      ...super.serialize(),
      __className,
    };
  }
  deserialize(data: $FlowFixMe) {
    const {__className, ...rest} = data;
    super.deserialize(rest);
    this.__className = __className;
  }
  clone() {
    return new EmojiNode(this.__className, this.__text, this.__key);
  }
  createDOM(editorThemeClasses: EditorThemeClasses) {
    const dom = super.createDOM(editorThemeClasses);
    dom.className = this.__className;
    return dom;
  }
}

function createEmojiNode(className: string, emojiText: string): EmojiNode {
  return new EmojiNode(className, emojiText).makeImmutable();
}
