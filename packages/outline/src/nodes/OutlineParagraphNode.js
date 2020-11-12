// @flow strict-local

import {BlockNode} from './OutlineBlockNode';

export class ParagraphNode extends BlockNode {
  _type: 'paragraph';

  constructor() {
    super('p');
    this._type = 'paragraph';
  }
  clone(): ParagraphNode {
    const clone = new ParagraphNode();
    clone._children = [...this._children];
    clone._parent = this._parent;
    clone._key = this._key;
    clone._flags = this._flags;
    return clone;
  }
}

export function createParagraphNode(): ParagraphNode {
  return new ParagraphNode();
}
