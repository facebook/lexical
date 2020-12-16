/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {NodeKey} from './OutlineNode';

import {BlockNode} from './OutlineBlockNode';

export class ParagraphNode extends BlockNode {
  type: 'paragraph';

  constructor(key?: NodeKey) {
    super(key);
    this.type = 'paragraph';
  }

  clone(): ParagraphNode {
    const clone = new ParagraphNode(this.key);
    clone.children = [...this.children];
    clone.parent = this.parent;
    clone.flags = this.flags;
    return clone;
  }

  // View

  createDOM(): HTMLElement {
    return document.createElement('p');
  }
  updateDOM(prevNode: ParagraphNode, dom: HTMLElement): boolean {
    return false;
  }
}

export function createParagraphNode(): ParagraphNode {
  const paragraph = new ParagraphNode();
  // Paragraph nodes align with text direection
  paragraph.makeDirectioned();
  return paragraph;
}
