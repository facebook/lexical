/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */
import type {EditorConfig, LexicalNode, NodeKey, RangeSelection} from 'lexical';
import {ElementNode} from 'lexical';
export declare class OverflowNode extends ElementNode {
  static getType(): string;
  static clone(node: OverflowNode): OverflowNode;
  constructor(key?: NodeKey);
  createDOM<EditorContext>(config: EditorConfig<EditorContext>): HTMLElement;
  updateDOM(prevNode: OverflowNode, dom: HTMLElement): boolean;
  insertNewAfter(selection: RangeSelection): null | LexicalNode;
  excludeFromCopy(): boolean;
}
export function $createOverflowNode(): OverflowNode;
export function $isOverflowNode(node: LexicalNode | null): boolean;
