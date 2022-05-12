/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  DOMConversionMap,
  DOMConversionOutput,
  NodeKey,
} from '../LexicalNode';

import {LexicalNode} from '../LexicalNode';

export interface SerializedLineBreakNode {
  type: 'linebreak';
}

export class LineBreakNode extends LexicalNode {
  static getType(): string {
    return 'linebreak';
  }

  static clone(node: LineBreakNode): LineBreakNode {
    return new LineBreakNode(node.__key);
  }

  constructor(key?: NodeKey): void {
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

  exportJSON(): SerializedLineBreakNode {
    return {
      type: 'linebreak',
    };
  }
}

function convertLineBreakElement(node: Node): DOMConversionOutput {
  return {node: $createLineBreakNode()};
}

export function $createLineBreakNode(): LineBreakNode {
  return new LineBreakNode();
}

export function $isLineBreakNode(node: ?LexicalNode): boolean %checks {
  return node instanceof LineBreakNode;
}
