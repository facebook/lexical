/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {KlassConstructor} from '../LexicalEditor';
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
  ['constructor']!: KlassConstructor<typeof LineBreakNode>;
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
        if (isOnlyChild(node)) {
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

function isOnlyChild(node: Node): boolean {
  const parentElement = node.parentElement;
  if (parentElement !== null) {
    const firstChild = parentElement.firstChild!;
    if (
      firstChild === node ||
      (firstChild.nextSibling === node && isWhitespaceDomTextNode(firstChild))
    ) {
      const lastChild = parentElement.lastChild!;
      if (
        lastChild === node ||
        (lastChild.previousSibling === node &&
          isWhitespaceDomTextNode(lastChild))
      ) {
        return true;
      }
    }
  }
  return false;
}

function isWhitespaceDomTextNode(node: Node): boolean {
  return (
    node.nodeType === DOM_TEXT_TYPE &&
    /^( |\t|\r?\n)+$/.test(node.textContent || '')
  );
}
