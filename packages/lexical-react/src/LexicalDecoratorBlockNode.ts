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
import type {JSX} from 'react';

import {DecoratorNode, enumValue, objectValue} from 'lexical';

export type SerializedDecoratorBlockNode = Spread<
  {
    format: ElementFormatType;
  },
  SerializedLexicalNode
>;

/**
 * The schema for the node-specific properties of a
 * {@link SerializedDecoratorBlockNode}. DecoratorBlockNode is an abstract base
 * (it has no concrete node type) so it publishes its schema on `$config` under
 * the well-known `Symbol.for('DecoratorBlockNode')` key; concrete subclasses
 * compose it with their own.
 */
export const decoratorBlockNodeSchema = objectValue({
  format: enumValue(['', 'left', 'start', 'center', 'right', 'end', 'justify']),
});

export class DecoratorBlockNode extends DecoratorNode<JSX.Element> {
  __format: ElementFormatType;

  constructor(format?: ElementFormatType, key?: NodeKey) {
    super(key);
    this.__format = format || '';
  }

  afterCloneFrom(prevNode: this): void {
    super.afterCloneFrom(prevNode);
    this.__format = prevNode.__format;
  }

  exportJSON(): SerializedDecoratorBlockNode {
    return {
      ...super.exportJSON(),
      format: this.__format || '',
    };
  }

  $config() {
    return this.config(Symbol.for('DecoratorBlockNode'), {
      json: decoratorBlockNodeSchema,
    });
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

  setFormat(format: ElementFormatType): this {
    const self = this.getWritable();
    self.__format = format;
    return self;
  }

  getFormat(): ElementFormatType {
    return this.getLatest().__format;
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
