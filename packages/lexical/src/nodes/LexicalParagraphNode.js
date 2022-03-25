/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {EditorConfig, EditorThemeClasses} from '../LexicalEditor';
import type {
  DOMConversionMap,
  DOMConversionOutput,
  LexicalNode,
  NodeKey,
} from '../LexicalNode';

import {getCachedClassNameArray} from '../LexicalUtils';
import {ElementNode} from './LexicalElementNode';
import {$isTextNode} from './LexicalTextNode';

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
    const dom = document.createElement('p');
    const classNames = getCachedClassNameArray<EditorThemeClasses>(
      config.theme,
      'paragraph',
    );
    if (classNames !== undefined) {
      const domClassList = dom.classList;
      domClassList.add(...classNames);
    }
    return dom;
  }
  updateDOM(prevNode: ParagraphNode, dom: HTMLElement): boolean {
    return false;
  }

  static convertDOM(): DOMConversionMap | null {
    return {
      p: (node: Node) => ({
        conversion: convertParagraphElement,
        priority: 0,
      }),
    };
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
    // If we have an empty (trimmed) first paragraph and try and remove it,
    // delete the paragraph as long as we have another sibling to go to
    if (
      children.length === 0 ||
      ($isTextNode(children[0]) && children[0].getTextContent().trim() === '')
    ) {
      const nextSibling = this.getNextSibling();
      if (nextSibling !== null) {
        this.selectNext();
        this.remove();
        return true;
      }
      const prevSibling = this.getPreviousSibling();
      if (prevSibling !== null) {
        this.selectPrevious();
        this.remove();
        return true;
      }
    }
    return false;
  }
}

function convertParagraphElement(): DOMConversionOutput {
  return {node: $createParagraphNode()};
}

export function $createParagraphNode(): ParagraphNode {
  return new ParagraphNode();
}

export function $isParagraphNode(node: ?LexicalNode): boolean %checks {
  return node instanceof ParagraphNode;
}
