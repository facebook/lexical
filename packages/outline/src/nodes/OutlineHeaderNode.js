// @flow strict

import {BranchNode} from '../OutlineBranchNode';

type HeaderTagType = 'h1' | 'h2' | 'h3' | 'h4' | 'h5';

export class HeaderNode extends BranchNode {
  _type: 'header';
  _tag: HeaderTagType;

  constructor(tag: HeaderTagType) {
    super();
    this._tag = tag;
    this._type = 'header';
  }
  clone(): HeaderNode {
    const clone = new HeaderNode(this._tag);
    clone._children = [...this._children];
    clone._parent = this._parent;
    clone._key = this._key;
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
