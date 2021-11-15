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
  OutlineNode,
  State,
  NodeKey,
  EditorConfig,
  Selection,
} from 'outline';

import {useEffect} from 'react';
import {TextNode} from 'outline';

const emojis: Map<string, [string, string]> = new Map([
  [':)', ['emoji happysmile', '🙂']],
  [':D', ['emoji veryhappysmile', '😀']],
  [':(', ['emoji unhappysmile', '🙁']],
  ['<3', ['emoji heart', '❤']],
  ['🙂', ['emoji happysmile', '🙂']],
  ['😀', ['emoji veryhappysmile', '😀']],
  ['🙁', ['emoji unhappysmile', '🙁']],
  ['❤', ['emoji heart', '❤']],
]);

function findAndTransformEmoji(
  selection: null | Selection,
  node: TextNode,
): null | TextNode {
  const text = node.getTextContent();
  for (let i = 0; i < text.length; i++) {
    const emojiData = emojis.get(text[i]) || emojis.get(text.slice(i, i + 2));

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
      return emojiNode;
    }
  }
  return null;
}

function textNodeTransform(node: TextNode, state: State): void {
  const selection = state.getSelection();
  let targetNode = node;

  while (targetNode !== null) {
    if (!targetNode.isSimpleText()) {
      return;
    }
    targetNode = findAndTransformEmoji(selection, targetNode);
  }
}

export function useEmojis(editor: OutlineEditor): void {
  useEffect(() => {
    editor.registerNodeType('emoji', EmojiNode);
    const removeTransform = editor.addTransform('text', textNodeTransform);
    return () => {
      removeTransform();
    };
  }, [editor]);
}

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

  createDOM<EditorContext>(config: EditorConfig<EditorContext>): HTMLElement {
    const dom = super.createDOM(config);
    dom.className = this.__className;
    return dom;
  }
}

export function isEmojiNode(node: OutlineNode): boolean %checks {
  return node instanceof EmojiNode;
}

function createEmojiNode(className: string, emojiText: string): EmojiNode {
  return new EmojiNode(className, emojiText).makeImmutable();
}
