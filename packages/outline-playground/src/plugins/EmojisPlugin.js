/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineEditor, Selection} from 'outline';

import PlaygroundEditorContext from '../context/PlaygroundEditorContext';
import {useEditorContext} from 'outline-react/OutlineEditorContext';
import {createEmojiNode, EmojiNode} from '../nodes/EmojiNode';
import {useEffect} from 'react';
import {getSelection, TextNode} from 'outline';

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

function textNodeTransform(node: TextNode): void {
  const selection = getSelection();
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
    editor.registerNode(EmojiNode);
    return editor.addTransform(TextNode, textNodeTransform);
  }, [editor]);
}

export default function EmojisPlugin(): React$Node {
  const [editor] = useEditorContext(PlaygroundEditorContext);
  useEmojis(editor);
  return null;
}
