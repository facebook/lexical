/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalNode, RangeSelection} from 'lexical';
import {LinkNode} from 'lexical/LinkNode';
export declare class AutoLinkNode extends LinkNode {
  getType(): string;
  // $FlowFixMe[incompatible-extend]
  clone(node: AutoLinkNode): AutoLinkNode;
  insertNewAfter(selection: RangeSelection): null | LexicalNode;
  // $FlowFixMe[incompatible-extend]
  canInsertTextAfter(): true;
}
export function $createAutoLinkNode(url: string): AutoLinkNode;
export function $isAutoLinkNode(node: LexicalNode | null | undefined): boolean;
