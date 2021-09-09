/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {NodeKey, EditorConfig} from 'outline';
import type {ParagraphNode} from 'outline/ParagraphNode';

import {BlockNode} from 'outline';
import {createParagraphNode} from 'outline/ParagraphNode';

export class QuoteNode extends BlockNode {
  static deserialize(data: $FlowFixMe): QuoteNode {
    return new QuoteNode();
  }

  constructor(key?: NodeKey) {
    super(key);
    this.__type = 'quote';
  }

  clone(): QuoteNode {
    return new QuoteNode();
  }

  // View

  createDOM<EditorContext>(config: EditorConfig<EditorContext>): HTMLElement {
    const element = document.createElement('blockquote');
    const theme = config.theme;
    const className = theme.quote;
    if (className !== undefined) {
      element.className = className;
    }
    return element;
  }
  updateDOM(prevNode: QuoteNode, dom: HTMLElement): boolean {
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

  collapseAtStart(): true {
    const paragraph = createParagraphNode();
    const children = this.getChildren();
    children.forEach((child) => paragraph.append(child));
    this.replace(paragraph);
    return true;
  }
}

export function createQuoteNode(): QuoteNode {
  return new QuoteNode();
}
