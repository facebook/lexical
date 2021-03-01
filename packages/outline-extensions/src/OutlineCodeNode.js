/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {NodeKey, EditorThemeClasses} from 'outline';
import type {ParagraphNode} from 'outline-extensions/ParagraphNode';

import {BlockNode} from 'outline';
import {createParagraphNode} from 'outline-extensions/ParagraphNode';

export class CodeNode extends BlockNode {
  constructor(key?: NodeKey) {
    super(key);
    this.__type = 'code';
  }

  clone(): CodeNode {
    const clone = new CodeNode();
    clone.__children = [...this.__children];
    clone.__parent = this.__parent;
    clone.__flags = this.__flags;
    return clone;
  }

  // View

  createDOM(editorThemeClasses: EditorThemeClasses): HTMLElement {
    const element = document.createElement('code');
    const className = editorThemeClasses.code;
    if (className !== undefined) {
      element.className = className;
    }
    return element;
  }
  updateDOM(prevNode: CodeNode, dom: HTMLElement): boolean {
    return false;
  }

  // Mutation

  mergeWithPreviousSibling(): void {
    const prevBlock = this.getPreviousSibling();
    if (prevBlock === null) {
      const paragraph = createParagraphNode();
      const children = this.getChildren();
      children.forEach((child) => paragraph.append(child));
      this.replace(paragraph);
      return;
    }
    super.mergeWithPreviousSibling();
  }

  insertNewAfter(): ParagraphNode {
    const newBlock = createParagraphNode();
    this.insertAfter(newBlock);
    return newBlock;
  }
}

export function createCodeNode(): CodeNode {
  return new CodeNode();
}
