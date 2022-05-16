/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {ElementFormatType, LexicalNode, NodeKey} from 'lexical';

import {DecoratorNode} from 'lexical';

declare class DecoratorBlockNode<T> extends DecoratorNode<T> {
  __format: ElementFormatType;
  constructor(format?: ElementFormatType | null, key?: NodeKey);
  createDOM(): HTMLElement;
  setFormat(format: ElementFormatType): void;
}

declare function $isDecoratorBlockNode<T>(
  node: LexicalNode,
): node is DecoratorBlockNode<T>;
