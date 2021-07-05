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
} from 'outline';

import {useEffect} from 'react';
import {TextNode, isTextNode} from 'outline';
import {isHashtagNode} from 'outline/HashtagNode';

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
  if (isHashtagNode(node)) {
    return;
  }

  const selection = view.getSelection();

  let targetNode = node;
  let parentToNormalize = null;

  while (targetNode !== null) {
    targetNode = findAndTransformEmoji(selection, targetNode);
    if (targetNode !== null) {
      parentToNormalize = targetNode.getParent();
    }
  }
  if (parentToNormalize !== null) {
    parentToNormalize.normalizeTextNodes(true);
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

class EmojiNode extends TextNode {
  __className: string;

  constructor(className: string, text: string, key?: NodeKey) {
    super(text, key);
    this.__className = className;
    this.__type = 'emoji';
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
