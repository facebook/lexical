// @flow strict-local

import {BlockNode} from './OutlineBlockNode';

type HeaderTagType = 'h1' | 'h2' | 'h3' | 'h4' | 'h5';

export class HeaderNode extends BlockNode {
  _type: 'header';

  constructor(tag: string) {
    super(tag);
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
}

export function createHeaderNode(headerTag: HeaderTagType): HeaderNode {
  return new HeaderNode(headerTag);
}
