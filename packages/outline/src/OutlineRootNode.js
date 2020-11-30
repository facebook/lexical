// @flow strict

import {BlockNode} from './OutlineBlockNode';

export class RootNode extends BlockNode {
  _type: 'root';

  constructor() {
    super('root');
    this._type = 'root';
  }
  static parse(
    // $FlowFixMe: TODO: refine
    data: Object,
  ): RootNode {
    return new RootNode();
  }
  clone(): RootNode {
    const clone = new RootNode();
    clone._children = [...this._children];
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
