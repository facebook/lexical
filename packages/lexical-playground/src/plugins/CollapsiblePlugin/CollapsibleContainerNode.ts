/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  DOMConversionMap,
  EditorConfig,
  ElementNode,
  LexicalNode,
  NodeKey,
  SerializedElementNode,
  Spread,
} from 'lexical';

type SerializedCollapsibleContainerNode = Spread<
  {
    collapsed: boolean;
    type: 'collapsible-container';
    version: 1;
  },
  SerializedElementNode
>;

export class CollapsibleContainerNode extends ElementNode {
  __collapsed: boolean;

  constructor(collapsed: boolean, key?: NodeKey) {
    super(key);
    this.__collapsed = collapsed !== false;
  }

  static getType(): string {
    return 'collapsible-container';
  }

  static clone(node: CollapsibleContainerNode): CollapsibleContainerNode {
    return new CollapsibleContainerNode(node.__collapsed, node.__key);
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = document.createElement('div');
    dom.classList.add('Collapsible__container');
    if (this.__collapsed) {
      dom.classList.add('Collapsible__collapsed');
    }
    return dom;
  }

  updateDOM(prevNode: CollapsibleContainerNode, dom: HTMLElement): boolean {
    if (prevNode.__collapsed !== this.__collapsed) {
      if (this.__collapsed) {
        dom.classList.add('Collapsible__collapsed');
      } else {
        dom.classList.remove('Collapsible__collapsed');
      }
    }

    return false;
  }

  static importDOM(): DOMConversionMap | null {
    return {};
  }

  static importJSON(
    serializedNode: SerializedCollapsibleContainerNode,
  ): CollapsibleContainerNode {
    const node = $createCollapsibleContainerNode();
    node.setCollapsed(serializedNode.collapsed);
    return node;
  }

  exportJSON(): SerializedCollapsibleContainerNode {
    return {
      ...super.exportJSON(),
      collapsed: this.getCollapsed(),
      type: 'collapsible-container',
      version: 1,
    };
  }

  setCollapsed(collapsed: boolean): void {
    const writable = this.getWritable();
    writable.__collapsed = collapsed;
  }

  getCollapsed(): boolean {
    return this.__collapsed;
  }
}

export function $createCollapsibleContainerNode(): CollapsibleContainerNode {
  return new CollapsibleContainerNode(false);
}

export function $isCollapsibleContainerNode(
  node: LexicalNode | null | undefined,
): node is CollapsibleContainerNode {
  return node instanceof CollapsibleContainerNode;
}
