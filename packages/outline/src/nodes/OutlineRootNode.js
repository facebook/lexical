// @flow strict-local

import {BlockNode} from './OutlineBlockNode';

export class RootNode extends BlockNode {
  _type: 'root';

  constructor() {
    super('', 'root');
    this._type = 'root';
  }
  clone(): RootNode {
    const clone = new RootNode();
    clone._children = [...this._children];
    clone._parent = this._parent;
    clone._key = this._key;
    clone._flags = this._flags;
    return clone;
  }
}

export function createRootNode(): RootNode {
  return new RootNode();
}
