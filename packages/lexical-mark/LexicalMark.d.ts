/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import type {NodeKey, RangeSelection, TextNode} from 'lexical';
import {ElementNode, LexicalNode} from 'lexical';
export declare class MarkNode extends ElementNode {
  __ids: Array<string>;
  clone(node: MarkNode): MarkNode;
  constructor(ids: Array<string>, key?: NodeKey);
  hasID(id: string): boolean;
  getIDs(): Array<string>;
  addID(id: string): void;
  deleteID(id: string): void;
  canInsertTextBefore(): false;
  canInsertTextAfter(): false;
  isInline(): true;
}
export function $isMarkNode(node: LexicalNode | null | undefined): boolean;
export function $createMarkNode(ids: Array<string>): MarkNode;
export function $getMarkIDs(
  node: TextNode,
  offset: number,
): null | Array<string>;
export function $wrapSelectionInMarkNode(
  selection: RangeSelection,
  isBackward: boolean,
  id: string,
): void;
export function $unwrapMarkNode(node: MarkNode): void;
