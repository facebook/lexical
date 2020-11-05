import {BlockNode} from './OutlineBlockNode';

export class BodyNode extends BlockNode {
  constructor() {
    super();
    this._key = 'body';
    this._type = 'body';
  }
  clone() {
    const clone = super.clone();
    clone._type = 'body';
    return clone;
  }
  isBody() {
    return true;
  }
}

export function createBodyNode() {
  return new BodyNode();
}
