/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {EditorConfig, LexicalNode, NodeKey} from 'lexical';
import {TextNode} from 'lexical';

export declare class HashtagNode extends TextNode {
  static getType(): string;
  static clone(node: HashtagNode): HashtagNode;
  constructor(text: string, key?: NodeKey);
  createDOM(config: EditorConfig): HTMLElement;
  canInsertTextBefore(): boolean;
  isTextEntity(): true;
}
export function $createHashtagNode(text?: string): TextNode;
export function $isHashtagNode(
  node: LexicalNode | null | undefined,
): node is HashtagNode;
