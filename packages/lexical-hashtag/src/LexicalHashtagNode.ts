/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  $applyNodeReplacement,
  addClassNamesToElement,
  type EditorConfig,
  type LexicalNode,
  TextNode,
} from 'lexical';

/** @noInheritDoc */
export class HashtagNode extends TextNode {
  $config() {
    return this.config('hashtag', {extends: TextNode});
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

/**
 * Generates a HashtagNode, which is a string following the format of a # followed by some text, eg. #lexical.
 * @param text - The text used inside the HashtagNode.
 * @returns - The HashtagNode with the embedded text.
 */
export function $createHashtagNode(text = ''): HashtagNode {
  return $applyNodeReplacement(new HashtagNode(text));
}

/**
 * Determines if node is a HashtagNode.
 * @param node - The node to be checked.
 * @returns true if node is a HashtagNode, false otherwise.
 */
export function $isHashtagNode(
  node: LexicalNode | null | undefined,
): node is HashtagNode {
  return node instanceof HashtagNode;
}
