/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {NodeKey} from 'outline';

import {BlockNode} from 'outline';
import {createParagraphNode} from 'outline-extensions/ParagraphNode';

type HeadingTagType = 'h1' | 'h2' | 'h3' | 'h4' | 'h5';

export class HeadingNode extends BlockNode {
  __type: 'heading';
  __tag: HeadingTagType;

  constructor(tag: HeadingTagType, key?: NodeKey) {
    super(key);
    this.__tag = tag;
    this.__type = 'heading';
  }
  static parse(
    // $FlowFixMe: TODO: refine
    data: Object,
  ): HeadingNode {
    const header = new HeadingNode(data._tag);
    header.flags = data.flags;
    return header;
  }
  clone(): HeadingNode {
    const clone = new HeadingNode(this.__tag, this.__key);
    clone.__children = [...this.__children];
    clone.__parent = this.__parent;
    clone.__flags = this.__flags;
    return clone;
  }

  // View

  createDOM(): HTMLElement {
    return document.createElement(this.__tag);
  }
  updateDOM(prevNode: HeadingNode, dom: HTMLElement): boolean {
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
}

export function createHeadingNode(headingTag: HeadingTagType): HeadingNode {
  return new HeadingNode(headingTag);
}
