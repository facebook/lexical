/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {EditorConfig, LexicalNode, NodeKey, RangeSelection} from 'lexical';
import {ElementNode} from 'lexical';
export declare class LinkNode extends ElementNode {
  __url: string;
  getType(): string;
  clone(node: LinkNode): LinkNode;
  constructor(url: string, key?: NodeKey);
  createDOM<EditorContext>(config: EditorConfig<EditorContext>): HTMLElement;
  updateDOM<EditorContext>(
    prevNode: LinkNode, // $FlowFixMe DOM
    dom: HTMLAnchorElement,
    config: EditorConfig<EditorContext>,
  ): boolean;
  getURL(): string;
  setURL(url: string): void;
  insertNewAfter(selection: RangeSelection): null | LexicalNode;
  canInsertTextBefore(): false;
  canInsertTextAfter(): boolean;
  canBeEmpty(): false;
  isInline(): true;
}
export function $createLinkNode(url: string): LinkNode;
export function $isLinkNode(node: LexicalNode | null | undefined): boolean;
