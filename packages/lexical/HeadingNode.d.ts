/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {EditorConfig, LexicalNode, NodeKey, ParagraphNode} from 'lexical';
import {ElementNode} from 'lexical';
type HeadingTagType = 'h1' | 'h2' | 'h3' | 'h4' | 'h5';
export declare class HeadingNode extends ElementNode {
  __tag: HeadingTagType;
  getType(): string;
  clone(node: HeadingNode): HeadingNode;
  constructor(tag: HeadingTagType, key?: NodeKey);
  getTag(): HeadingTagType;
  createDOM<EditorContext>(config: EditorConfig<EditorContext>): HTMLElement;
  updateDOM(prevNode: HeadingNode, dom: HTMLElement): boolean;
  insertNewAfter(): ParagraphNode;
  collapseAtStart(): true;
}
export function $createHeadingNode(headingTag: HeadingTagType): HeadingNode;
export function $isHeadingNode(node: LexicalNode | null | undefined): boolean;
