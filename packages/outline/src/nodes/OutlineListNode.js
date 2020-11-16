// @flow strict

import {BranchNode} from '../OutlineBranchNode';

type ListNodeTagType = 'ul' | 'ol';

export class ListNode extends BranchNode {
  _type: 'list';
  _tag: ListNodeTagType;

  constructor(tag: ListNodeTagType) {
    super();
    this._tag = tag;
    this._type = 'list';
  }
  clone(): ListNode {
    const clone = new ListNode(this._tag);
    clone._children = [...this._children];
    clone._parent = this._parent;
    clone._key = this._key;
    clone._flags = this._flags;
    return clone;
  }

  // View

  _create(): HTMLElement {
    return document.createElement(this._tag);
  }
  // $FlowFixMe: prevNode is always a ListNode
  _update(prevNode: ListNode, dom: HTMLElement): boolean {
    return false;
  }
}

export function createListNode(tag: ListNodeTagType): ListNode {
  return new ListNode(tag);
}
