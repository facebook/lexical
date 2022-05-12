/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  EditorConfig,
  LexicalNode,
  NodeKey,
  SerializedTextNode,
} from 'lexical';

import {addClassNamesToElement} from '@lexical/utils';
import {TextNode} from 'lexical';

interface SerializedHashtagNode extends SerializedTextNode {
  type: 'hashtag';
}

export class HashtagNode extends TextNode {
  static getType(): string {
    return 'hashtag';
  }

  static clone(node: HashtagNode): HashtagNode {
    return new HashtagNode(node.__text, node.__key);
  }

  constructor(text: string, key?: NodeKey) {
    super(text, key);
  }

  createDOM(config: EditorConfig): HTMLElement {
    const element = super.createDOM(config);
    addClassNamesToElement(element, config.theme.hashtag);
    return element;
  }

  static importJSON(serializedNode: SerializedHashtagNode): HashtagNode {
    const node = $createHashtagNode(serializedNode.text);
    node.setFormat(serializedNode.format);
    node.setDetail(serializedNode.detail);
    node.setMode(serializedNode.mode);
    node.setStyle(serializedNode.style);
    return node;
  }

  exportJSON(): SerializedHashtagNode {
    return {
      ...super.exportJSON(),
      type: 'hashtag',
    };
  }

  canInsertTextBefore(): boolean {
    return false;
  }

  isTextEntity(): true {
    return true;
  }
}

export function $createHashtagNode(text = ''): HashtagNode {
  return new HashtagNode(text);
}

export function $isHashtagNode(
  node: LexicalNode | null | undefined,
): node is HashtagNode {
  return node instanceof HashtagNode;
}
