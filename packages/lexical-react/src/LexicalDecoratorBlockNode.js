/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {ElementFormatType, LexicalNode} from 'lexical';

import {DecoratorNode} from 'lexical';

export class DecoratorBlockNode extends DecoratorNode<React$Node> {
  __format: ?ElementFormatType;

  createDOM(): HTMLElement {
    return document.createElement('div');
  }

  setFormat(format: ElementFormatType): void {
    const self = this.getWritable();
    self.__format = format;
  }
}

export function $createDecoratorBlockNode(): DecoratorBlockNode {
  return new DecoratorBlockNode();
}

export function $isDecoratorBlockNode(node: ?LexicalNode): boolean %checks {
  return node instanceof DecoratorBlockNode;
}
