/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  LexicalNode,
  LexicalUpdateJSON,
  NodeKey,
  SerializedLexicalNode,
  Spread,
  TextFormatType,
} from 'lexical';
import type {JSX} from 'react';

import {
  $applyNodeReplacement,
  DecoratorNode,
  TEXT_TYPE_TO_FORMAT,
  toggleTextFormatType,
} from 'lexical';

export type SerializedDecoratorTextNode = Spread<
  {
    format: number;
  },
  SerializedLexicalNode
>;

export class DecoratorTextNode extends DecoratorNode<JSX.Element> {
  __format: number;

  constructor(key?: NodeKey) {
    super(key);
    this.__format = 0;
  }

  getFormat(): number {
    const self = this.getLatest();
    return self.__format;
  }

  getFormatFlags(type: TextFormatType, alignWithFormat: null | number): number {
    const self = this.getLatest();
    const format = self.__format;
    return toggleTextFormatType(format, type, alignWithFormat);
  }

  hasFormat(type: TextFormatType): boolean {
    const formatFlag = TEXT_TYPE_TO_FORMAT[type];
    return (this.getFormat() & formatFlag) !== 0;
  }

  setFormat(type: number): this {
    const self = this.getWritable();
    self.__format = type;
    return self;
  }

  toggleFormat(type: TextFormatType): this {
    const format = this.getFormat();
    const newFormat = toggleTextFormatType(format, type, null);
    return this.setFormat(newFormat);
  }

  isInline(): true {
    return true;
  }

  exportJSON(): SerializedDecoratorTextNode {
    return {
      ...super.exportJSON(),
      format: this.__format || 0,
    };
  }

  static importJSON(serializedNode: SerializedDecoratorTextNode) {
    return $createDecoratorTextNode().updateFromJSON(serializedNode);
  }

  updateFromJSON(
    serializedNode: LexicalUpdateJSON<SerializedDecoratorTextNode>,
  ): this {
    return super
      .updateFromJSON(serializedNode)
      .setFormat(serializedNode.format || 0);
  }

  afterCloneFrom(prevNode: this) {
    super.afterCloneFrom(prevNode);
    this.__format = prevNode.__format;
  }

  createDOM(): HTMLElement {
    return document.createElement('span');
  }

  updateDOM(): false {
    return false;
  }
}

export function $createDecoratorTextNode() {
  return $applyNodeReplacement(new DecoratorTextNode());
}

export function $isDecoratorTextNode(
  node: LexicalNode | null | undefined,
): node is DecoratorTextNode {
  return node instanceof DecoratorTextNode;
}
