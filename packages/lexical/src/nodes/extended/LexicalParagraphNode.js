/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {LexicalNode, NodeKey, EditorConfig} from 'lexical';

import {addClassNamesToElement} from '@lexical/helpers/elements';
import {$isElementNode, $isTextNode, ElementNode} from 'lexical';

export class ParagraphNode extends ElementNode {
  static getType(): string {
    return 'paragraph';
  }

  static clone(node: ParagraphNode): ParagraphNode {
    return new ParagraphNode(node.__key);
  }

  constructor(key?: NodeKey): void {
    super(key);
  }

  // View

  createDOM<EditorContext>(config: EditorConfig<EditorContext>): HTMLElement {
    const element = document.createElement('p');
    addClassNamesToElement(element, config.theme.paragraph);
    return element;
  }
  updateDOM(prevNode: ParagraphNode, dom: HTMLElement): boolean {
    return false;
  }

  // Mutation

  insertNewAfter(): ParagraphNode {
    const newElement = $createParagraphNode();
    const direction = this.getDirection();
    newElement.setDirection(direction);
    this.insertAfter(newElement);
    return newElement;
  }

  collapseAtStart(): boolean {
    const children = this.getChildren();
    const sibling = this.getNextSibling();
    // If we have an empty (trimmed) first paragraph and try and remove it,
    // delete the paragraph as long as we have another sibling to go to
    if (
      $isElementNode(sibling) &&
      this.getIndexWithinParent() === 0 &&
      (children.length === 0 ||
        ($isTextNode(children[0]) &&
          children[0].getTextContent().trim() === ''))
    ) {
      const firstChild = sibling.getFirstChild();
      if ($isTextNode(firstChild)) {
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

export function $createParagraphNode(): ParagraphNode {
  return new ParagraphNode();
}

export function $isParagraphNode(node: ?LexicalNode): boolean %checks {
  return node instanceof ParagraphNode;
}
