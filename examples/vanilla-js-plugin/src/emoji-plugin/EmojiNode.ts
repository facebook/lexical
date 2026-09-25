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

// @emoji-datasource-facebook is defined in vite.config.ts
const emojiImages = new Map(
  Object.entries(
    import.meta.glob<string>('@emoji-datasource-facebook/*.png', {
      eager: true,
      import: 'default',
      query: '?url&no-inline',
    }),
  ).map(([path, url]) => [path.slice(path.lastIndexOf('/') + 1), url]),
);

function getEmojiBackground(unifiedID: string): string {
  const url = emojiImages.get(`${unifiedID.toLowerCase()}.png`);
  return url ? `url('${url}')` : '';
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
    dom.style.backgroundImage = getEmojiBackground(this.__unifiedID);
    return dom;
  }

  updateDOM(prevNode: this, dom: HTMLElement, config: EditorConfig): boolean {
    if (super.updateDOM(prevNode, dom, config)) {
      return true;
    }
    if (this.__unifiedID !== prevNode.__unifiedID) {
      dom.style.backgroundImage = getEmojiBackground(this.__unifiedID);
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
