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

import {LexicalNode} from '../LexicalNode';
import {
  $applyNodeReplacement,
  isBlockDomNode,
  isDOMTextNode,
  isHTMLElement,
} from '../LexicalUtils';

export type SerializedLineBreakNode = SerializedLexicalNode;

/** @noInheritDoc */
export class LineBreakNode extends LexicalNode {
  /** @internal */
  declare ['constructor']: KlassConstructor<typeof LineBreakNode>;
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

  isInline(): true {
    return true;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      br: (node: Node) => {
        if (
          isOnlyChildInBlockNode(node) ||
          (isAppleInterchangeNewline(node) && isLastChildInBlockNode(node))
        ) {
          return null;
        }
        return {
          conversion: $convertLineBreakElement,
          priority: 0,
        };
      },
    };
  }

  static importJSON(
    serializedLineBreakNode: SerializedLineBreakNode,
  ): LineBreakNode {
    return $createLineBreakNode().updateFromJSON(serializedLineBreakNode);
  }
}

function $convertLineBreakElement(node: Node): DOMConversionOutput {
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

/**
 * True when `node` is the sole non-whitespace child of a block DOM
 * element. Used by the LineBreak importer to drop stray `<br>` elements
 * that the legacy `$generateNodesFromDOM` also skipped (matches the
 * behavior of `LineBreakNode.importDOM`).
 *
 * @experimental
 */
export function isOnlyChildInBlockNode(node: Node): boolean {
  const parentElement = node.parentElement;
  if (parentElement !== null && isBlockDomNode(parentElement)) {
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

/**
 * True when `node` is the trailing non-whitespace child of a block DOM
 * element (excluding the only-child case). Used by the LineBreak
 * importer to drop trailing `<br>` elements like the Apple-interchange
 * clipboard artifact (matches `LineBreakNode.importDOM`).
 *
 * @experimental
 */
export function isLastChildInBlockNode(node: Node): boolean {
  const parentElement = node.parentElement;
  if (parentElement !== null && isBlockDomNode(parentElement)) {
    // check if node is first child, because only child dont count
    const firstChild = parentElement.firstChild!;
    if (
      firstChild === node ||
      (firstChild.nextSibling === node && isWhitespaceDomTextNode(firstChild))
    ) {
      return false;
    }

    // check if its last child
    const lastChild = parentElement.lastChild!;
    if (
      lastChild === node ||
      (lastChild.previousSibling === node && isWhitespaceDomTextNode(lastChild))
    ) {
      return true;
    }
  }
  return false;
}

export function isAppleInterchangeNewline(node: Node): boolean {
  return (
    node.nodeName === 'BR' &&
    isHTMLElement(node) &&
    node.getAttribute('class') === 'Apple-interchange-newline'
  );
}

function isWhitespaceDomTextNode(node: Node): boolean {
  return isDOMTextNode(node) && /^( |\t|\r?\n)+$/.test(node.textContent || '');
}
