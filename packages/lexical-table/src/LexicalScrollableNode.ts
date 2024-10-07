/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {
  $applyNodeReplacement,
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  ElementNode,
  LexicalEditor,
  LexicalNode,
  SerializedElementNode,
} from 'lexical';

import {$isTableNode} from './LexicalTableNode';

/**
 * This node allows the nodes it wraps to have a width greater than that of the editor,
 * encapsulating only its content in a horizontal scroll. You'll want to use it to wrap
 * nodes that have a "width" property and are NOT decoratorNodes. See TableNode as an example.
 */
export class ScrollableNode extends ElementNode {
  static getType() {
    return 'scrollable';
  }

  static clone(node: ScrollableNode): ScrollableNode {
    return new ScrollableNode(node.__key);
  }

  createDOM(_config: EditorConfig, _editor: LexicalEditor): HTMLElement {
    const dom = document.createElement('div');
    dom.classList.add('lexical-scrollable');
    dom.style.overflowX = 'auto';
    return dom;
  }

  updateDOM() {
    return false;
  }

  canIndent() {
    return false;
  }

  exportJSON() {
    return {
      ...super.exportJSON(),
      type: ScrollableNode.getType(),
      version: 1,
    };
  }

  static importJSON(_serializedNode: SerializedElementNode): ScrollableNode {
    return $createScrollableNode();
  }

  exportDOM(editor: LexicalEditor): DOMExportOutput {
    return super.exportDOM(editor);
  }

  static importDOM(): DOMConversionMap | null {
    return {
      div: (domElement: HTMLElement) => {
        if (domElement.classList.contains('lexical-scrollable')) {
          return {
            conversion: $convertScrollableElement,
            priority: 0,
          };
        } else {
          return null;
        }
      },
    };
  }

  static transform(): ((node: LexicalNode) => void) | null {
    return (node: LexicalNode) => {
      const selection = $getSelection();
      if ((node as ScrollableNode).isEmpty()) {
        const root = $getRoot();
        if (root.__first === node.getKey() && root.getChildrenSize() === 1) {
          root.append($createParagraphNode());
          node.remove();
        } else {
          node.remove();
        }
        return;
      }
      const firstChild: ElementNode = (node as ScrollableNode).getFirstChild()!;
      if (firstChild && !$isTableNode(firstChild)) {
        firstChild.remove();
      }
      if (
        $isRangeSelection(selection) &&
        selection.anchor.key === node.getKey()
      ) {
        firstChild.getFirstDescendant()!.selectStart();
      }
    };
  }
}

export function $isScrollableNode(
  node: LexicalNode | null | undefined,
): node is ScrollableNode {
  return node instanceof ScrollableNode;
}

export function $createScrollableNode(): ScrollableNode {
  return $applyNodeReplacement(new ScrollableNode());
}

function $convertScrollableElement(domNode: HTMLElement): DOMConversionOutput {
  return {node: $createScrollableNode()};
}
