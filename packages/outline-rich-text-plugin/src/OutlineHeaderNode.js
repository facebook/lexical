// @flow strict

import type {NodeKey} from 'outline';

import {BlockNode} from 'outline';

type HeaderTagType = 'h1' | 'h2' | 'h3' | 'h4' | 'h5';

export class HeaderNode extends BlockNode {
  _type: 'header';
  _tag: HeaderTagType;

  constructor(tag: HeaderTagType, key?: NodeKey) {
    super(key);
    this._tag = tag;
    this.type = 'header';
  }
  static parse(
    // $FlowFixMe: TODO: refine
    data: Object,
  ): HeaderNode {
    const header = new HeaderNode(data._tag);
    header.flags = data.flags;
    return header;
  }
  clone(): HeaderNode {
    const clone = new HeaderNode(this._tag, this.key);
    clone.children = [...this.children];
    clone.parent = this.parent;
    clone.flags = this.flags;
    return clone;
  }

  // View

  createDOM(): HTMLElement {
    return document.createElement(this._tag);
  }
  // $FlowFixMe: prevNode is always a HeaderNode
  updateDOM(prevNode: HeaderNode, dom: HTMLElement): boolean {
    return false;
  }
}

export function createHeaderNode(headerTag: HeaderTagType): HeaderNode {
  return new HeaderNode(headerTag);
}
