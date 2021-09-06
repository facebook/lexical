/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineNode, NodeKey, EditorConfig} from 'outline';

import {BlockNode} from 'outline';

export class ParagraphNode extends BlockNode {
  static deserialize(data: $FlowFixMe): ParagraphNode {
    return new ParagraphNode();
  }

  constructor(key?: NodeKey) {
    super(key);
    this.__type = 'paragraph';
  }

  clone(): ParagraphNode {
    return new ParagraphNode(this.__key);
  }

  // View

  createDOM<EditorContext>(config: EditorConfig<EditorContext>): HTMLElement {
    const element = document.createElement('p');
    const theme = config.theme;
    const className = theme.paragraph;
    if (className !== undefined) {
      element.className = className;
    }
    return element;
  }
  updateDOM(prevNode: ParagraphNode, dom: HTMLElement): boolean {
    return false;
  }

  // Mutation

  insertNewAfter(): ParagraphNode {
    const newBlock = createParagraphNode();
    const direction = this.getDirection();
    newBlock.setDirection(direction);
    this.insertAfter(newBlock);
    return newBlock;
  }
}

export function createParagraphNode(): ParagraphNode {
  return new ParagraphNode();
}

export function isParagraphNode(node: ?OutlineNode): boolean %checks {
  return node instanceof ParagraphNode;
}
