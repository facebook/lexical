/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// [docs:emoji-extension] Read directly by the Creating an Extension guide.
import {defineExtension, TextNode} from 'lexical';

import {$createEmojiNode, EmojiNode} from './EmojiNode';
import findEmoji from './findEmoji';

function $textNodeTransform(node: TextNode): void {
  if (!node.isSimpleText() || node.hasFormat('code')) {
    return;
  }

  const text = node.getTextContent();

  // Find only 1st occurrence as transform will be re-run anyway for the rest
  // because newly inserted nodes are considered to be dirty
  const emojiMatch = findEmoji(text);
  if (emojiMatch === null) {
    return;
  }

  let targetNode;
  if (emojiMatch.position === 0) {
    // First text chunk within string, splitting into 2 parts
    [targetNode] = node.splitText(
      emojiMatch.position + emojiMatch.shortcode.length,
    );
  } else {
    // In the middle of a string
    [, targetNode] = node.splitText(
      emojiMatch.position,
      emojiMatch.position + emojiMatch.shortcode.length,
    );
  }

  const emojiNode = $createEmojiNode(emojiMatch.unifiedID)
    .setFormat(targetNode.getFormat())
    .setStyle(targetNode.getStyle());
  targetNode.replace(emojiNode);
}

export const EmojiExtension = defineExtension({
  name: '@lexical/examples/Emoji',
  nodes: () => [EmojiNode],
  register(editor) {
    return editor.registerNodeTransform(TextNode, $textNodeTransform);
  },
});
// [/docs:emoji-extension]
