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
import type {CodeHighlightNode} from 'lexical/CodeHighlightNode';

import {addClassNamesToElement} from '@lexical/helpers/elements';
import {ElementNode, $createLineBreakNode} from 'lexical';
import {$createParagraphNode} from 'lexical/ParagraphNode';
import {$createCodeHighlightNode} from 'lexical/CodeHighlightNode';

export class CodeNode extends ElementNode {
  __language: string | void;

  static getType(): string {
    return 'code';
  }

  static clone(node: CodeNode): CodeNode {
    return new CodeNode(node.__language, node.__key);
  }

  constructor(language?: string, key?: NodeKey): void {
    super(key);
    this.__language = language;
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
  insertNewAfter(
    selection: Selection,
  ): null | ParagraphNode | CodeHighlightNode {
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

    // If the selection is within the codeblock, find all leading tabs and
    // spaces of the current line. Create a new line that has all those
    // tabs and spaces, such that leading indentation is preserved.
    const selectedChild = children.find(
      (child) => child.__key === selection.anchor.key,
    );
    if (selectedChild != null) {
      const selectedChildText = selectedChild.getTextContent();
      let leadingWhitespace = 0;
      while (
        leadingWhitespace < selectedChildText.length &&
        /[\t ]/.test(selectedChildText[leadingWhitespace])
      ) {
        leadingWhitespace += 1;
      }
      if (leadingWhitespace > 0) {
        const whitespace = selectedChildText.substring(0, leadingWhitespace);
        const indentedChild = $createCodeHighlightNode(whitespace);
        selectedChild.insertAfter(indentedChild);
        selection.insertNodes([$createLineBreakNode()]);
        indentedChild.select();
        return indentedChild;
      }
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

  setLanguage(language: string): void {
    const writable = this.getWritable();
    writable.__language = language;
  }

  getLanguage(): string | void {
    return this.getLatest().__language;
  }
}

export function $createCodeNode(language?: string): CodeNode {
  return new CodeNode(language);
}

export function $isCodeNode(node: ?LexicalNode): boolean %checks {
  return node instanceof CodeNode;
}
