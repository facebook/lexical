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
  LexicalUpdateJSON,
  NodeKey,
  SerializedLexicalNode,
  Spread,
} from 'lexical';
import type {JSX} from 'react';

import {$getDocument, DecoratorNode} from 'lexical';

/**
 * The serialized form of a {@link DecoratorBlockNode}: the base serialized node
 * data plus the block's element `format` (alignment).
 */
export type SerializedDecoratorBlockNode = Spread<
  {
    format: ElementFormatType;
  },
  SerializedLexicalNode
>;

/**
 * A base class for block-level {@link DecoratorNode}s (decorator nodes rendered
 * on their own line rather than inline). It stores an {@link ElementFormatType}
 * alignment, is not indentable, and renders into a `<div>`. Extend it for custom
 * block embeds such as images, videos, or tweets, typically pairing it with
 * {@link BlockWithAlignableContents} to handle selection and alignment.
 */
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

  updateFromJSON(
    serializedNode: LexicalUpdateJSON<SerializedDecoratorBlockNode>,
  ): this {
    return super
      .updateFromJSON(serializedNode)
      .setFormat(serializedNode.format || '');
  }

  canIndent(): false {
    return false;
  }

  createDOM(): HTMLElement {
    return $getDocument().createElement('div');
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

/**
 * @returns `true` if `node` is a {@link DecoratorBlockNode}, narrowing its type.
 */
export function $isDecoratorBlockNode(
  node: LexicalNode | null | undefined,
): node is DecoratorBlockNode {
  return node instanceof DecoratorBlockNode;
}
