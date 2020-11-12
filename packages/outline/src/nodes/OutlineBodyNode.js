// @flow strict-local

import {BlockNode} from './OutlineBlockNode';

export class BodyNode extends BlockNode {
  _type: 'body';

  constructor() {
    super('', 'body');
    this._type = 'body';
  }
  clone(): BodyNode {
    const clone = new BodyNode();
    clone._children = [...this._children];
    clone._parent = this._parent;
    clone._key = this._key;
    clone._flags = this._flags;
    return clone;
  }
}

export function createBodyNode(): BodyNode {
  return new BodyNode();
}
