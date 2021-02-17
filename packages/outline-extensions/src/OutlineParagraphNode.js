/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {NodeKey, EditorThemeClasses} from 'outline';

import {BlockNode, TextNode} from 'outline';

export class ParagraphNode extends BlockNode {
  constructor(key?: NodeKey) {
    super(key);
    this.__type = 'paragraph';
  }

  clone(): ParagraphNode {
    const clone = new ParagraphNode(this.__key);
    clone.__children = [...this.__children];
    clone.__parent = this.__parent;
    clone.__flags = this.__flags;
    return clone;
  }

  // View

  createDOM(editorThemeClasses: EditorThemeClasses): HTMLElement {
    const element = document.createElement('p');
    const className = editorThemeClasses.paragraph;
    if (className !== undefined) {
      element.className = className;
    }
    return element;
  }
  updateDOM(prevNode: ParagraphNode, dom: HTMLElement): boolean {
    return false;
  }

  // Mutation

  mergeWithPreviousSibling(): void {
    const prevBlock = this.getPreviousSibling();
    if (prevBlock !== null) {
      super.mergeWithPreviousSibling();
      return;
    }
    // Otherwise just reset the text node flags
    const firstChild = this.getFirstChild();
    if (firstChild instanceof TextNode && firstChild.getFlags() !== 0) {
      firstChild.setFlags(0);
    }
  }

  mergeWithNextSibling(): void {
    const nextBlock = this.getNextSibling();
    if (nextBlock !== null) {
      super.mergeWithNextSibling();
      return;
    }
    // Otherwise just reset the text node flags
    const firstChild = this.getFirstChild();
    if (firstChild instanceof TextNode && firstChild.getFlags() !== 0) {
      firstChild.setFlags(0);
    }
  }

  insertNewAfter(): ParagraphNode {
    const newBlock = createParagraphNode();
    this.insertAfter(newBlock);
    return newBlock;
  }
}

export function createParagraphNode(): ParagraphNode {
  return new ParagraphNode();
}
