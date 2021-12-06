/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {NodeKey, EditorConfig, Selection} from 'outline';
import type {ParagraphNode} from 'outline/ParagraphNode';

import {addClassNamesToElement} from 'outline/elements';
import {ElementNode} from 'outline';
import {createParagraphNode} from 'outline/ParagraphNode';

export class CodeNode extends ElementNode {
  static getType(): string {
    return 'code';
  }

  static clone(node: CodeNode): CodeNode {
    return new CodeNode(node.__key);
  }

  constructor(key?: NodeKey) {
    super(key);
  }

  // View

  createDOM<EditorContext>(config: EditorConfig<EditorContext>): HTMLElement {
    const element = document.createElement('code');
    addClassNamesToElement(element, config.theme.code);
    element.setAttribute('spellcheck', 'false');
    return element;
  }
  updateDOM(prevNode: CodeNode, dom: HTMLElement): boolean {
    return false;
  }

  // Mutation

  insertNewAfter(selection: Selection): null | ParagraphNode {
    const textContent = this.getTextContent();
    const anchorNode = selection.anchor.getNode();
    const anchorTextContentLength = anchorNode.getTextContentSize();
    const children = this.getChildren();
    const childrenLength = children.length;
    const lastChild = children[childrenLength - 1];
    const hasTwoEndingLineBreaks = textContent.slice(-2) === '\n\n';

    const offset = selection.anchor.offset;
    if (
      anchorNode !== lastChild ||
      offset !== anchorTextContentLength ||
      !hasTwoEndingLineBreaks
    ) {
      return null;
    }
    // Remove the dangling new lines
    if (hasTwoEndingLineBreaks) {
      // We offset by 1 extra because the last node should always be a text
      // node to ensure selection works as intended.
      const firstLinkBreak = children[childrenLength - 2];
      // Again offset because of wrapped text nodes
      const secondLinkBreak = children[childrenLength - 4];
      firstLinkBreak.remove();
      secondLinkBreak.remove();
    }
    const newElement = createParagraphNode();
    this.insertAfter(newElement);
    return newElement;
  }

  canInsertTab(): true {
    return true;
  }

  collapseAtStart(): true {
    const paragraph = createParagraphNode();
    const children = this.getChildren();
    children.forEach((child) => paragraph.append(child));
    this.replace(paragraph);
    return true;
  }
}

export function createCodeNode(): CodeNode {
  return new CodeNode();
}
