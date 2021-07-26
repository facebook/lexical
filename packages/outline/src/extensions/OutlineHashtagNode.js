/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {NodeKey, OutlineNode, EditorThemeClasses} from 'outline';

import {TextNode, createTextNode} from 'outline';

export class HashtagNode extends TextNode {
  static deserialize(data: $FlowFixMe): HashtagNode {
    return new HashtagNode(data.__text);
  }

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

  setTextContent(text: string): void {
    super.setTextContent(text);
    const isHashtag = isHashtagNode(this);
    // Handle hashtags
    if (isHashtag && this.getParent() !== null && !this.isComposing()) {
      const indexOfHash = text.indexOf('#');
      let targetNode = this;
      if (indexOfHash === -1 || targetNode.getTextContent() === '#') {
        toggleHashtag(targetNode);
      } else if (indexOfHash > 0) {
        [targetNode] = this.splitText(indexOfHash);
        toggleHashtag(targetNode);
      }
      // Check for invalid characters
      const targetTextContent = targetNode.getTextContent().slice(1);
      const indexOfInvalidChar = targetTextContent.search(
        /[\s.,\\\/#!$%\^&\*;:{}=\-`~()@]/,
      );
      if (indexOfInvalidChar === 0) {
        toggleHashtag(targetNode);
      } else if (indexOfInvalidChar > 0) {
        [targetNode] = targetNode.splitText(indexOfInvalidChar + 1);
        toggleHashtag(targetNode);
      }
    }
  }
}

export function toggleHashtag(node: TextNode): void {
  const text = node.getTextContent();
  const replacement = !isHashtagNode(node)
    ? createHashtagNode(text)
    : createTextNode(text);
  node.replace(replacement, true);
}

export function createHashtagNode(text?: string = ''): TextNode {
  return new HashtagNode(text);
}

export function isHashtagNode(node: ?OutlineNode): boolean %checks {
  return node instanceof HashtagNode;
}
