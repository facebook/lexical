// @flow strict

import type {NodeKey} from '../OutlineNode';

import {BlockNode} from '../OutlineBlockNode';

export class ListItemNode extends BlockNode {
  _type: 'listitem';

  constructor(key?: NodeKey) {
    super(key);
    this._type = 'listitem';
  }
  clone(): ListItemNode {
    const clone = new ListItemNode(this._key);
    clone._children = [...this._children];
    clone._parent = this._parent;
    clone._flags = this._flags;
    return clone;
  }

  // View

  _create(): HTMLElement {
    return document.createElement('li');
  }
  // $FlowFixMe: prevNode is always a ListItemNode
  _update(prevNode: ListItemNode, dom: HTMLElement): boolean {
    return false;
  }
}

export function createListItemNode(): ListItemNode {
  return new ListItemNode();
}
