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

type HeadingTagType = 'h1' | 'h2' | 'h3' | 'h4' | 'h5';

export class HeadingNode extends BlockNode {
  _type: 'heading';
  _tag: HeadingTagType;

  constructor(tag: HeadingTagType, key?: NodeKey) {
    super(key);
    this._tag = tag;
    this.type = 'heading';
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
    const clone = new HeadingNode(this._tag, this.key);
    clone.children = [...this.children];
    clone.parent = this.parent;
    clone.flags = this.flags;
    return clone;
  }

  // View

  createDOM(): HTMLElement {
    return document.createElement(this._tag);
  }
  updateDOM(prevNode: HeadingNode, dom: HTMLElement): boolean {
    return false;
  }
}

export function createHeadingNode(headingTag: HeadingTagType): HeadingNode {
  return new HeadingNode(headingTag);
}
