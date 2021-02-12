/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {NodeKey} from 'outline';
import type {ParagraphNode} from 'outline-extensions/ParagraphNode';

import {BlockNode} from 'outline';
import {createParagraphNode} from 'outline-extensions/ParagraphNode';

export class ListItemNode extends BlockNode {
  constructor(key?: NodeKey) {
    super(key);
    this.__type = 'listitem';
  }

  clone(): ListItemNode {
    const clone = new ListItemNode(this.__key);
    clone.__children = [...this.__children];
    clone.__parent = this.__parent;
    clone.__flags = this.__flags;
    return clone;
  }

  // View

  createDOM(): HTMLElement {
    return document.createElement('li');
  }
  updateDOM(prevNode: ListItemNode, dom: HTMLElement): boolean {
    return false;
  }

  // Mutation

  mergeWithPreviousSibling(): void {
    const prevBlock = this.getPreviousSibling();
    if (prevBlock !== null) {
      super.mergeWithPreviousSibling();
      return;
    }
    const listNode = this.getParentOrThrow();
    const paragraph = createParagraphNode();
    const children = this.getChildren();
    children.forEach((child) => paragraph.append(child));

    if (listNode.getChildren().length === 1) {
      listNode.replace(paragraph);
    } else {
      listNode.insertBefore(paragraph);
      this.remove();
    }
  }

  mergeWithNextSibling(): void {
    const nextBlock = this.getNextSibling();
    if (nextBlock !== null) {
      super.mergeWithNextSibling();
      return;
    }
  }

  insertNewAfter(): ListItemNode | ParagraphNode {
    const nextSibling = this.getNextSibling();
    const prevSibling = this.getPreviousSibling();
    const list = this.getParent();
    let newBlock;

    if (
      list instanceof BlockNode &&
      this.getTextContent() === '' &&
      (prevSibling === null || nextSibling === null)
    ) {
      if (nextSibling === null) {
        newBlock = createParagraphNode();
        this.remove();
        list.insertAfter(newBlock);
      } else {
        newBlock = createParagraphNode();
        this.remove();
        list.insertBefore(newBlock);
      }
      if (list.getChildren().length === 0) {
        list.remove();
      }
    } else {
      newBlock = createListItemNode();
      this.insertAfter(newBlock);
    }

    return newBlock;
  }
}

export function createListItemNode(): ListItemNode {
  return new ListItemNode();
}
