/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {EditorConfig, LexicalNode, NodeKey, RangeSelection} from 'lexical';
import {ElementNode} from 'lexical';
export declare class OverflowNode extends ElementNode {
  getType(): string;
  clone(node: OverflowNode): OverflowNode;
  constructor(key?: NodeKey);
  createDOM<EditorContext>(config: EditorConfig<EditorContext>): HTMLElement;
  updateDOM(prevNode: OverflowNode, dom: HTMLElement): boolean;
  insertNewAfter(selection: RangeSelection): null | ElementNode;
  excludeFromCopy(): boolean;
}
export function $createOverflowNode(): OverflowNode;
export function $isOverflowNode(node: LexicalNode | null | undefined): boolean;
