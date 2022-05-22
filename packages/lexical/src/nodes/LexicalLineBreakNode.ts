/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  DOMConversionMap,
  DOMConversionOutput,
  NodeKey,
  SerializedLexicalNode,
} from '../LexicalNode';

import {Spread} from 'libdefs/globals';

import {LexicalNode} from '../LexicalNode';

export type SerializedLineBreakNode = Spread<
  {
    type: 'linebreak';
  },
  SerializedLexicalNode
>;

export class LineBreakNode extends LexicalNode {
  static getType(): string {
    return 'linebreak';
  }

  static clone(node: LineBreakNode): LineBreakNode {
    return new LineBreakNode(node.__key);
  }

  constructor(key?: NodeKey) {
    super(key);
  }

  getTextContent(): '\n' {
    return '\n';
  }

  createDOM(): HTMLElement {
    return document.createElement('br');
  }

  updateDOM(): false {
    return false;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      br: (node: Node) => ({
        conversion: convertLineBreakElement,
        priority: 0,
      }),
    };
  }

  static importJSON(
    serializedLineBreakNode: SerializedLineBreakNode,
  ): LineBreakNode {
    return $createLineBreakNode();
  }

  exportJSON(): SerializedLexicalNode {
    return {
      type: 'linebreak',
      version: 1,
    };
  }
}

function convertLineBreakElement(node: Node): DOMConversionOutput {
  return {node: $createLineBreakNode()};
}

export function $createLineBreakNode(): LineBreakNode {
  return new LineBreakNode();
}

export function $isLineBreakNode(
  node: LexicalNode | null | undefined,
): node is LineBreakNode {
  return node instanceof LineBreakNode;
}
