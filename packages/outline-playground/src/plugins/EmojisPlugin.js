/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 */

import type {TextNode, State, OutlineEditor, Selection} from 'outline';

import PlaygroundController from '../controllers/PlaygroundController';
import {useController} from 'outline-react/OutlineController';
import {createEmojiNode, EmojiNode} from '../nodes/EmojiNode';
import {useEffect} from 'react';

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
    return editor.addTransform('text', textNodeTransform);
  }, [editor]);
}

export default function EmojisPlugin(): React$Node {
  const [editor] = useController(PlaygroundController);
  useEmojis(editor);
  return null;
}
