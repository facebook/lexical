/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import {
  EditorConfig,
  ElementNode,
  LexicalNode,
  NodeKey,
  SerializedElementNode,
  Spread,
  TextNode,
} from 'lexical';

export type SerializeChildgroupNode = Spread<
  {
    type: 'childgroup';
  },
  SerializedElementNode
>;

export class ChildgroupNode extends ElementNode {
  static getType(): string {
    return 'childgroup';
  }

  static clone(node: ChildgroupNode): ChildgroupNode {
    return new ChildgroupNode(node.__key);
  }

  constructor(key?: NodeKey) {
    super(key);
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = document.createElement('div');
    return dom;
  }

  updateDOM(
    prevNode: TextNode,
    dom: HTMLElement,
    config: EditorConfig,
  ): boolean {
    // return super.updateDOM(prevNode, dom, config);
    return false;
  }

  static importJSON(serializedNode: SerializeChildgroupNode): ChildgroupNode {
    const node = $createChildgroupNode();
    return node;
  }

  exportJSON(): SerializeChildgroupNode {
    return {
      ...super.exportJSON(),
      type: 'childgroup',
    };
  }

  getClassName(): string {
    const self = this.getLatest();
    return self.__className;
  }
}

export function $isChildgroupNode(
  node: LexicalNode | null | undefined,
): node is ChildgroupNode {
  return node instanceof ChildgroupNode;
}

export function $createChildgroupNode(): ChildgroupNode {
  return new ChildgroupNode();
}
