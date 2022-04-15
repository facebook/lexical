/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {EditorConfig, LexicalNode, NodeKey} from 'lexical';

import {addClassNamesToElement} from '@lexical/utils';
import {TextNode} from 'lexical';

export class HashtagNode extends TextNode {
  static getType(): string {
    return 'hashtag';
  }

  static clone(node: HashtagNode): HashtagNode {
    return new HashtagNode(node.__text, node.__key);
  }

  constructor(text: string, key?: NodeKey): void {
    super(text, key);
  }

  createDOM(config: EditorConfig): HTMLElement {
    const element = super.createDOM(config);
    addClassNamesToElement(element, config.theme.hashtag);
    return element;
  }

  canInsertTextBefore(): boolean {
    return false;
  }

  isTextEntity(): true {
    return true;
  }
}

export function $createHashtagNode(text?: string = ''): HashtagNode {
  return new HashtagNode(text);
}

export function $isHashtagNode(node: ?LexicalNode): boolean %checks {
  return node instanceof HashtagNode;
}
