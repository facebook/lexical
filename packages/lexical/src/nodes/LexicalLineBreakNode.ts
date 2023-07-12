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

import {DOM_TEXT_TYPE} from '../LexicalConstants';
import {LexicalNode} from '../LexicalNode';
import {$applyNodeReplacement} from '../LexicalUtils';

export type SerializedLineBreakNode = SerializedLexicalNode;

/** @noInheritDoc */
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
      br: (node: Node) => {
        const parentElement = node.parentElement;
        // If the <br> is the only child, then skip including it
        let firstChild;
        let lastChild;
        if (
          parentElement !== null &&
          ((firstChild = parentElement.firstChild) === node ||
            ((firstChild as Text).nextSibling === node &&
              (firstChild as Text).nodeType === DOM_TEXT_TYPE &&
              ((firstChild as Text).textContent || '').match(
                /^( |\t|\r?\n)+$/,
              ) !== null)) &&
          ((lastChild = parentElement.lastChild) === node ||
            ((lastChild as Text).previousSibling === node &&
              (lastChild as Text).nodeType === DOM_TEXT_TYPE &&
              ((lastChild as Text).textContent || '').match(
                /^( |\t|\r?\n)+$/,
              ) !== null))
        ) {
          return null;
        }
        return {
          conversion: convertLineBreakElement,
          priority: 0,
        };
      },
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
  return $applyNodeReplacement(new LineBreakNode());
}

export function $isLineBreakNode(
  node: LexicalNode | null | undefined,
): node is LineBreakNode {
  return node instanceof LineBreakNode;
}
