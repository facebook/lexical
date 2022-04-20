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

export class LexicalBlockDecoratorNode extends DecoratorNode<React$Node> {
  __format: ?ElementFormatType;

  createDOM(): HTMLElement {
    return document.createElement('div');
  }

  isTopLevel(): true {
    return true;
  }

  setFormat(format: ElementFormatType): void {
    const self = this.getWritable();
    self.__format = format;
  }
}

export function $createLexicalBlockDecoratorNode(): LexicalBlockDecoratorNode {
  return new LexicalBlockDecoratorNode();
}

export function $isLexicalBlockDecoratorNode(
  node: ?LexicalNode,
): boolean %checks {
  return node instanceof LexicalBlockDecoratorNode;
}
