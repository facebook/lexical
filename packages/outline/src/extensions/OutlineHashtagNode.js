/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {NodeKey, OutlineNode, EditorThemeClasses} from 'outline';

import {TextNode} from 'outline';

export class HashtagNode extends TextNode {
  constructor(text: string, key?: NodeKey) {
    super(text, key);
    this.__type = 'hashtag';
  }

  clone(): HashtagNode {
    return new HashtagNode(this.__text, this.__key);
  }

  createDOM(editorThemeClasses: EditorThemeClasses): HTMLElement {
    const element = super.createDOM(editorThemeClasses);
    if (editorThemeClasses.hashtag) {
      element.className = editorThemeClasses.hashtag;
    }
    return element;
  }
}

export function createHashtagNode(text?: string = ''): TextNode {
  return new HashtagNode(text);
}

export function isHashtagNode(node: ?OutlineNode): boolean %checks {
  return node instanceof HashtagNode;
}
