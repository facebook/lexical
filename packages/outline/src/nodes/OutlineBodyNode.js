import {BlockNode} from './OutlineBlockNode';

export class BodyNode extends BlockNode {
  constructor() {
    super();
    this._key = 'body';
    this._type = 'body';
  }
  clone() {
    const clone = new BodyNode();
    clone._children = [...this._children];
    clone._parent = this._parent;
    clone._key = this._key;
    clone._flags = this._flags;
    return clone;
  }
  isBody() {
    return true;
  }
}

export function createBodyNode() {
  return new BodyNode();
}
