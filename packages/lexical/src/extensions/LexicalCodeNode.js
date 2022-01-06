/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {NodeKey, EditorConfig, Selection, LexicalNode} from 'lexical';
import type {ParagraphNode} from 'lexical/ParagraphNode';

import {addClassNamesToElement} from 'lexical/elements';
import {ElementNode} from 'lexical';
import {$createParagraphNode} from 'lexical/ParagraphNode';

export class CodeNode extends ElementNode {
  static getType(): string {
    return 'code';
  }

  static clone(node: CodeNode): CodeNode {
    return new CodeNode(node.__key);
  }

  constructor(key?: NodeKey): void {
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
    const children = this.getChildren();
    const childrenLength = children.length;

    if (
      childrenLength >= 2 &&
      children[childrenLength - 1].getTextContent() === '\n' &&
      children[childrenLength - 2].getTextContent() === '\n' &&
      selection.isCollapsed() &&
      selection.anchor.key === this.__key &&
      selection.anchor.offset === childrenLength
    ) {
      children[childrenLength - 1].remove();
      children[childrenLength - 2].remove();
      const newElement = $createParagraphNode();
      this.insertAfter(newElement);
      return newElement;
    }

    return null;
  }

  canInsertTab(): true {
    return true;
  }

  collapseAtStart(): true {
    const paragraph = $createParagraphNode();
    const children = this.getChildren();
    children.forEach((child) => paragraph.append(child));
    this.replace(paragraph);
    return true;
  }
}

export function $createCodeNode(): CodeNode {
  return new CodeNode();
}

export function $isCodeNode(node: ?LexicalNode): boolean %checks {
  return node instanceof CodeNode;
}
