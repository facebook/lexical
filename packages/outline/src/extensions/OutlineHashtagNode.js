/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {NodeKey, OutlineNode, EditorConfig} from 'outline';

import {TextNode, isTextNode, createTextNode} from 'outline';

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

  createDOM<EditorContext>(config: EditorConfig<EditorContext>): HTMLElement {
    const element = super.createDOM(config);
    const theme = config.theme;
    if (theme.hashtag) {
      element.className = theme.hashtag;
    }
    return element;
  }

  setTextContent(text: string): TextNode {
    let targetNode = super.setTextContent(text);
    // Handle hashtags
    if (targetNode.getParent() !== null && !targetNode.isComposing()) {
      const indexOfHash = text.indexOf('#');
      if (indexOfHash === -1 || targetNode.getTextContent() === '#') {
        targetNode = toggleHashtag(targetNode);
      } else if (indexOfHash > 0) {
        [targetNode] = targetNode.splitText(indexOfHash);
        targetNode = toggleHashtag(targetNode);
      }
      // Check for invalid characters
      if (isTextNode(targetNode) && targetNode.isAttached()) {
        const targetTextContent = targetNode.getTextContent().slice(1);
        const indexOfInvalidChar = targetTextContent.search(
          /[\s.,\\\/#!$%\^&\*;:{}=\-`~()@]/,
        );
        if (indexOfInvalidChar === 0) {
          targetNode = toggleHashtag(targetNode);
        } else if (indexOfInvalidChar > 0) {
          [targetNode] = targetNode.splitText(indexOfInvalidChar + 1);
          targetNode = toggleHashtag(targetNode);
        }
      }
      return targetNode;
    }
    return this;
  }
}

export function toggleHashtag(node: TextNode): TextNode {
  const text = node.getTextContent();
  const replacement = !isHashtagNode(node)
    ? createHashtagNode(text)
    : createTextNode(text);
  node.replace(replacement, true);
  return replacement;
}

export function createHashtagNode(text?: string = ''): TextNode {
  return new HashtagNode(text);
}

export function isHashtagNode(node: ?OutlineNode): boolean %checks {
  return node instanceof HashtagNode;
}
