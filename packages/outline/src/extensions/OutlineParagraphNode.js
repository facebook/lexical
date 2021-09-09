/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineNode, NodeKey, EditorConfig} from 'outline';

import {isBlockNode, isTextNode, BlockNode} from 'outline';

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

  collapseAtStart(): boolean {
    const children = this.getChildren();
    const sibling = this.getNextSibling();
    // If we have an empty (trimmed) first paragraph and try and remove it,
    // delete the paragraph as long as we have another sibling to go to
    if (
      isBlockNode(sibling) &&
      this.getIndexWithinParent() === 0 &&
      (children.length === 0 ||
        (isTextNode(children[0]) && children[0].getTextContent().trim() === ''))
    ) {
      const firstChild = sibling.getFirstChild();
      if (isTextNode(firstChild)) {
        firstChild.select(0, 0);
      } else {
        sibling.select(0, 0);
      }
      this.remove();
      return true;
    }
    return false;
  }
}

export function createParagraphNode(): ParagraphNode {
  return new ParagraphNode();
}

export function isParagraphNode(node: ?OutlineNode): boolean %checks {
  return node instanceof ParagraphNode;
}
