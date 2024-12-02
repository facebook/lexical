/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  ElementFormatType,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from 'lexical';

import {DecoratorNode} from 'lexical';

export type SerializedDecoratorBlockNode = Spread<
  {
    format: ElementFormatType;
  },
  SerializedLexicalNode
>;

export class DecoratorBlockNode extends DecoratorNode<JSX.Element> {
  __format: ElementFormatType;

  constructor(format?: ElementFormatType, key?: NodeKey) {
    super(key);
    this.__format = format || '';
  }

  exportJSON(): SerializedDecoratorBlockNode {
    return {
      format: this.__format || '',
      type: 'decorator-block',
      version: 1,
    };
  }

  canIndent(): false {
    return false;
  }

  createDOM(): HTMLElement {
    return document.createElement('div');
  }

  updateDOM(): false {
    return false;
  }

  setFormat(format: ElementFormatType): void {
    const self = this.getWritable();
    self.__format = format;
  }

  isInline(): false {
    return false;
  }
}

export function $isDecoratorBlockNode(
  node: LexicalNode | null | undefined,
): node is DecoratorBlockNode {
  return node instanceof DecoratorBlockNode;
}
