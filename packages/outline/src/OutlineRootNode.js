// @flow strict

import {BlockNode} from './OutlineBlockNode';

export class RootNode extends BlockNode {
  type: 'root';

  constructor() {
    super('root');
    this.type = 'root';
  }

  clone(): RootNode {
    const clone = new RootNode();
    clone.children = [...this.children];
    return clone;
  }

  isAttached(): true {
    return true;
  }

  // View

  updateDOM(prevNode: RootNode, dom: HTMLElement): false {
    return false;
  }
}

export function createRootNode(): RootNode {
  return new RootNode();
}
