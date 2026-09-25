/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {
  $create,
  type EditorConfig,
  nodeSchema,
  stringValue,
  TextNode,
  withField,
} from 'lexical';

const BASE_EMOJI_URI =
  'https://cdn.jsdelivr.net/npm/emoji-datasource-facebook@15.1.2/img/facebook/64';

function applyEmojiImage(dom: HTMLElement, unifiedID: string): void {
  const url = `${BASE_EMOJI_URI}/${encodeURIComponent(unifiedID.toLowerCase())}.png`;
  // Keep the native emoji visible while loading, including for missing images.
  dom.classList.remove('emoji-node-loaded');
  dom.style.backgroundImage = '';
  dom.dataset.emojiUrl = url;
  const image = dom.ownerDocument.createElement('img');
  image.onload = () => {
    // A different ID may have been assigned while this image was loading.
    if (dom.dataset.emojiUrl === url) {
      dom.style.backgroundImage = `url('${url}')`;
      dom.classList.add('emoji-node-loaded');
    }
  };
  image.src = url;
}

const emojiNodeSchema = nodeSchema<EmojiNode>()({
  unifiedID: withField(stringValue(), {field: '__unifiedID'}),
});

export class EmojiNode extends TextNode {
  __unifiedID: string = '';

  $config() {
    return this.config('emoji', {
      extends: TextNode,
      json: emojiNodeSchema,
    });
  }

  getUnifiedID(): string {
    return this.getLatest().__unifiedID;
  }

  setUnifiedID(unifiedID: string): this {
    const self = this.getWritable();
    self.__unifiedID = unifiedID.toLowerCase();
    return self;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    dom.classList.add('emoji-node');
    applyEmojiImage(dom, this.__unifiedID);
    return dom;
  }

  updateDOM(prevNode: this, dom: HTMLElement, config: EditorConfig): boolean {
    if (super.updateDOM(prevNode, dom, config)) {
      return true;
    }
    if (
      this.__unifiedID !== prevNode.__unifiedID ||
      this.__style !== prevNode.__style
    ) {
      applyEmojiImage(dom, this.__unifiedID);
    }
    return false;
  }
}

export function $createEmojiNode(unifiedID: string): EmojiNode {
  const text = String.fromCodePoint(
    ...unifiedID.split('-').map(value => parseInt(value, 16)),
  );
  return $create(EmojiNode)
    .setTextContent(text)
    .setMode('token')
    .setUnifiedID(unifiedID);
}
