/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
// [docs:emoji-node] Read directly by the Creating an Extension guide.
import {$create, nodeSchema, stringValue, TextNode, withField} from 'lexical';

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
// [/docs:emoji-node]
