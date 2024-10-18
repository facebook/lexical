/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import {mergeRegister} from '@lexical/utils';
import {
  $applyNodeReplacement,
  $createParagraphNode,
  $getRoot,
  $getSelection,
  $normalizePoint__EXPERIMENTAL,
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  ElementNode,
  Klass,
  LexicalEditor,
  LexicalNode,
  SerializedElementNode,
} from 'lexical';
import invariant from 'shared/invariant';

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
}

export function $isScrollableNode(
  node: LexicalNode | null | undefined,
): node is ScrollableNode {
  return node instanceof ScrollableNode;
}

export function $createScrollableNode(): ScrollableNode {
  return $applyNodeReplacement(new ScrollableNode());
}

export interface ScrollableNodeConfig {
  scrollableChildNodes: readonly Klass<ElementNode>[];
  $isScrollableChild?: (node: LexicalNode | null) => boolean;
}

export function registerScrollableNodeTransform(
  editor: LexicalEditor,
  config: ScrollableNodeConfig,
): () => void {
  invariant(
    editor.hasNodes([ScrollableNode]),
    'TablePlugin: ScrollableNode not registered on editor',
  );
  const {
    scrollableChildNodes,
    $isScrollableChild = (node) =>
      node !== null &&
      scrollableChildNodes.some((klass) => node instanceof klass),
  } = config;
  return mergeRegister(
    editor.registerNodeTransform(ScrollableNode, (node) => {
      let onlyScrollableChild: LexicalNode | null = null;
      for (const child of node.getChildren()) {
        if (onlyScrollableChild === null && $isScrollableChild(child)) {
          onlyScrollableChild = child;
        } else {
          child.remove();
        }
      }
      if (onlyScrollableChild === null) {
        node.remove();
        const root = $getRoot();
        if (root.isEmpty()) {
          root.append($createParagraphNode());
        }
        return;
      }
      const selection = $getSelection();
      if (!selection) {
        return;
      }
      const nodeKey = node.getKey();
      for (const point of selection.getStartEndPoints() || []) {
        if (point.key === nodeKey) {
          $normalizePoint__EXPERIMENTAL(point);
        }
      }
    }),
    ...scrollableChildNodes.map((klass) =>
      editor.registerNodeTransform(klass, (node) => {
        const parent = node.getParent();
        if (!$isScrollableNode(parent)) {
          const scrollable = $createScrollableNode();
          node.insertBefore(scrollable);
          scrollable.append(node);
        }
      }),
    ),
  );
}

function $convertScrollableElement(domNode: HTMLElement): DOMConversionOutput {
  return {node: $createScrollableNode()};
}
