// @flow strict-local

import type {OutlineEditor, View, NodeKey} from 'outline';

import {useEffect} from 'react';
import {TextNode} from 'outline';

const baseEmojiStyle =
  'color: transparent;' +
  'background-size: 16px 16px;' +
  'height: 16px;' +
  'width: 16px;' +
  'background-position: center;' +
  'background-repeat: no-repeat;' +
  'display: inline-block;' +
  'margin: 0 1px;' +
  'text-align: center;' +
  'vertical-align: middle;';

const happySmile =
  baseEmojiStyle +
  'background-image: url(https://static.xx.fbcdn.net/images/emoji.php/v9/t4c/1/16/1f642.png);';
const veryHappySmile =
  baseEmojiStyle +
  'background-image: url(https://static.xx.fbcdn.net/images/emoji.php/v9/t51/1/16/1f603.png);';
const unhappySmile =
  baseEmojiStyle +
  'background-image: url(https://static.xx.fbcdn.net/images/emoji.php/v9/tcb/1/16/1f641.png);';
const heart =
  baseEmojiStyle +
  'background-image: url(https://static.xx.fbcdn.net/images/emoji.php/v9/t6c/1/16/2764.png);';

const emojis: {[string]: [string, string]} = {
  ':)': [happySmile, '🙂'],
  ':D': [veryHappySmile, '😀'],
  ':(': [unhappySmile, '🙁'],
  '<3': [heart, '❤'],
};

function textNodeTransform(node: TextNode, view: View): void {
  if (node.isSegmented() || node.isImmutable() || node.isHashtag()) {
    return;
  }

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
      emojiNode.selectAfter(0, 0);
      emojiNode.getParentOrThrow().normalizeTextNodes(true);
      break;
    }
  }
}

export default function useEmojis(editor: null | OutlineEditor): void {
  useEffect(() => {
    if (editor !== null) {
      const removeNodeType = editor.addNodeType('emoji', EmojiNode);
      const removeTransform = editor.addTextNodeTransform(textNodeTransform);
      return () => {
        removeNodeType();
        removeTransform();
      };
    }
  }, [editor]);
}

function createEmojiNode(cssText: string, emojiText: string): EmojiNode {
  return new EmojiNode(cssText, emojiText).makeImmutable();
}

class EmojiNode extends TextNode {
  cssText: string;

  constructor(cssText: string, text: string, key?: NodeKey) {
    super(text, key);
    this.cssText = cssText;
    this.__type = 'emoji';
  }

  clone() {
    const clone = new EmojiNode(this.cssText, this.__text, this.__key);
    clone.__parent = this.__parent;
    clone.__flags = this.__flags;
    return clone;
  }
  createDOM() {
    const dom = super.createDOM();
    dom.style.cssText = this.cssText;
    return dom;
  }
}
