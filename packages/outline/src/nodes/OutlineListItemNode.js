// @flow strict

import {BlockNode} from './OutlineBlockNode';

export class ListItemNode extends BlockNode {
  _type: 'listitem';

  constructor() {
    super('li');
    this._type = 'listitem';
  }
  clone(): ListItemNode {
    const clone = new ListItemNode();
    clone._children = [...this._children];
    clone._parent = this._parent;
    clone._key = this._key;
    clone._flags = this._flags;
    return clone;
  }
}

export function createListItemNode(): ListItemNode {
  return new ListItemNode();
}
