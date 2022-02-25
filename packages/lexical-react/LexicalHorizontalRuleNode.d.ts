/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {LexicalNode} from 'lexical';
import {DecoratorNode} from 'lexical';
export declare class HorizontalRuleNode extends DecoratorNode<React.ReactNode> {
  getType(): string;
  clone(node: HorizontalRuleNode): HorizontalRuleNode;
  createDOM(): HTMLElement;
  getTextContent(): '\n';
  isTopLevel(): true;
  updateDOM(): false;
  decorate(): React.ReactNode;
}
export function $createHorizontalRuleNode(): HorizontalRuleNode;
export function $isHorizontalRuleNode(
  node: LexicalNode | null | undefined,
): boolean;
