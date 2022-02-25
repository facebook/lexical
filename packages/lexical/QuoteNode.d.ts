/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {EditorConfig, LexicalNode, NodeKey, ParagraphNode} from 'lexical';
import {ElementNode} from 'lexical';
export declare class QuoteNode extends ElementNode {
  getType(): string;
  clone(node: QuoteNode): QuoteNode;
  constructor(key?: NodeKey);
  createDOM<EditorContext>(config: EditorConfig<EditorContext>): HTMLElement;
  updateDOM(prevNode: QuoteNode, dom: HTMLElement): boolean;
  insertNewAfter(): ParagraphNode;
  collapseAtStart(): true;
}
export function $createQuoteNode(): QuoteNode;
export function $isQuoteNode(node: LexicalNode | null | undefined): boolean;
