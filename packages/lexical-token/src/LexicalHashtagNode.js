/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {EditorConfig, LexicalNode, NodeKey} from 'lexical';

import {addClassNamesToElement} from '@lexical/helpers/elements';
import {$createTextNode, $isTextNode, TextNode} from 'lexical';

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

  createDOM<EditorContext>(config: EditorConfig<EditorContext>): HTMLElement {
    const element = super.createDOM(config);
    addClassNamesToElement(element, config.theme.hashtag);
    return element;
  }

  setTextContent(text: string): TextNode {
    let targetNode = super.setTextContent(text);
    // Handle hashtags
    if (targetNode.getParent() !== null && !targetNode.isComposing()) {
      const indexOfHash = text.indexOf('#');
      if (indexOfHash === -1 || targetNode.getTextContent() === '#') {
        targetNode = $toggleHashtag(targetNode);
      } else if (indexOfHash > 0) {
        [targetNode] = targetNode.splitText(indexOfHash);
        targetNode = $toggleHashtag(targetNode);
      }
      // Check for invalid characters
      if ($isTextNode(targetNode) && targetNode.isAttached()) {
        const targetTextContent = targetNode.getTextContent().slice(1);
        const indexOfInvalidChar = targetTextContent.search(
          /[\s.,\\\/#!$%\^&\*;:{}=\-`~()@]/,
        );
        if (indexOfInvalidChar === 0) {
          targetNode = $toggleHashtag(targetNode);
        } else if (indexOfInvalidChar > 0) {
          [, targetNode] = targetNode.splitText(indexOfInvalidChar + 1);
          targetNode = $toggleHashtag(targetNode);
        }
      }
      return targetNode;
    }
    return this;
  }

  canInsertTextBefore(): boolean {
    return false;
  }

  canInsertTextAfter(): boolean {
    return true;
  }
}

export function $toggleHashtag(node: TextNode): TextNode {
  const text = node.getTextContent();
  const replacement = !$isHashtagNode(node)
    ? $createHashtagNode(text)
    : $createTextNode(text);
  node.replace(replacement);
  return replacement;
}

export function $createHashtagNode(text?: string = ''): TextNode {
  return new HashtagNode(text);
}

export function $isHashtagNode(node: ?LexicalNode): boolean %checks {
  return node instanceof HashtagNode;
}
