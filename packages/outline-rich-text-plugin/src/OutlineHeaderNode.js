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
    this._type = 'header';
  }
  static parse(
    // $FlowFixMe: TODO: refine
    data: Object,
  ): HeaderNode {
    const header = new HeaderNode(data._tag);
    header._flags = data._flags;
    return header;
  }
  clone(): HeaderNode {
    const clone = new HeaderNode(this._tag, this._key);
    clone._children = [...this._children];
    clone._parent = this._parent;
    clone._flags = this._flags;
    return clone;
  }

  // View

  _create(): HTMLElement {
    return document.createElement(this._tag);
  }
  // $FlowFixMe: prevNode is always a HeaderNode
  _update(prevNode: HeaderNode, dom: HTMLElement): boolean {
    return false;
  }
}

export function createHeaderNode(headerTag: HeaderTagType): HeaderNode {
  return new HeaderNode(headerTag);
}
