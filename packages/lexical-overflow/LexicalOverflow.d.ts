/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  EditorConfig,
  LexicalNode,
  NodeKey,
  RangeSelection,
  SerializedElementNode,
} from 'lexical';

import {ElementNode} from 'lexical';
import {Spread} from 'libdefs/global';

export declare class OverflowNode extends ElementNode {
  static getType(): string;
  static clone(node: OverflowNode): OverflowNode;
  constructor(key?: NodeKey);
  createDOM(config: EditorConfig): HTMLElement;
  updateDOM(prevNode: OverflowNode, dom: HTMLElement): boolean;
  insertNewAfter(selection: RangeSelection): null | LexicalNode;
  excludeFromCopy(): boolean;
  static importJSON(serializedNode: SerializedOverflowNode): OverflowNode;
  exportJSON(): SerializedElementNode;
}

export function $createOverflowNode(): OverflowNode;
export function $isOverflowNode(node: LexicalNode | null): node is OverflowNode;

export type SerializedOverflowNode = Spread<
  {
    type: 'overflow';
  },
  SerializedElementNode
>;
