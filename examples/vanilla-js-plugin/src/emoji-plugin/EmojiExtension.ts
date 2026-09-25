/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// [docs:emoji-extension] Read directly by the Creating an Extension guide.
import {domOverride, DOMRenderExtension} from '@lexical/html';
import {version as emojiVersion} from 'emoji-datasource-facebook/package.json';
import {configExtension, defineExtension, TextNode} from 'lexical';

import {$createEmojiNode, EmojiNode} from './EmojiNode';
import findEmoji from './findEmoji';

const BASE_EMOJI_URI = `https://cdn.jsdelivr.net/npm/emoji-datasource-facebook@${emojiVersion}/img/facebook/64`;

function applyEmojiImage(dom: HTMLElement, unifiedID: string): void {
  const url = `${BASE_EMOJI_URI}/${encodeURIComponent(unifiedID.toLowerCase())}.png`;
  const backgroundImage = `url('${url}')`;
  if (dom.dataset.emojiUrl === url) {
    // TextNode may have updated inline styles. Restore the loaded background
    // without clearing it or starting another preload for the same image.
    if (dom.classList.contains('emoji-node-loaded')) {
      dom.style.backgroundImage = backgroundImage;
    }
    return;
  }
  // Keep the native emoji visible while loading, including for missing images.
  dom.classList.remove('emoji-node-loaded');
  dom.style.backgroundImage = '';
  dom.dataset.emojiUrl = url;
  const image = dom.ownerDocument.createElement('img');
  image.onload = () => {
    // A different ID may have been assigned while this image was loading.
    if (dom.dataset.emojiUrl === url) {
      dom.style.backgroundImage = backgroundImage;
      dom.classList.add('emoji-node-loaded');
    }
  };
  image.src = url;
}

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
  dependencies: [
    configExtension(DOMRenderExtension, {
      overrides: [
        domOverride([EmojiNode], {
          $decorateDOM(node, _prevNode, dom) {
            dom.classList.add('emoji-node');
            applyEmojiImage(dom, node.getUnifiedID());
          },
        }),
      ],
    }),
  ],
  name: '@lexical/examples/Emoji',
  nodes: () => [EmojiNode],
  register(editor) {
    return editor.registerNodeTransform(TextNode, $textNodeTransform);
  },
});
// [/docs:emoji-extension]
