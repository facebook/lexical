// @flow strict

import {BranchNode} from './OutlineBranchNode';

export class RootNode extends BranchNode {
  _type: 'root';

  constructor() {
    super('root');
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

  isAttached(): boolean {
    return true;
  }

  // View

  // $FlowFixMe: prevNode is always a RootNode
  _update(prevNode: RootNode, dom: HTMLElement): boolean {
    return false;
  }
}

export function createRootNode(): RootNode {
  return new RootNode();
}
