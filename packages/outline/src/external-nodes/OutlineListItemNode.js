// @flow strict

import type {NodeKey} from '../OutlineNode';

import {BlockNode} from '../OutlineBlockNode';

export class ListItemNode extends BlockNode {
  _type: 'listitem';

  constructor(key?: NodeKey) {
    super(key);
    this.type = 'listitem';
  }
  static parse(
    // $FlowFixMe: TODO: refine
    data: Object,
  ): ListItemNode {
    const header = new ListItemNode();
    header.flags = data.flags;
    return header;
  }
  clone(): ListItemNode {
    const clone = new ListItemNode(this.key);
    clone.children = [...this.children];
    clone.parent = this.parent;
    clone.flags = this.flags;
    return clone;
  }

  // View

  createDOM(): HTMLElement {
    return document.createElement('li');
  }
  // $FlowFixMe: prevNode is always a ListItemNode
  updateDOM(prevNode: ListItemNode, dom: HTMLElement): boolean {
    return false;
  }
}

export function createListItemNode(): ListItemNode {
  return new ListItemNode();
}
