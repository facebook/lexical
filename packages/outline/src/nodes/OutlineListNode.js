// @flow strict

import {BlockNode} from './OutlineBlockNode';

type ListNodeTagType = 'ul' | 'ol';

export class ListNode extends BlockNode {
  _type: 'list';

  constructor(tag: string) {
    super(tag);
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
}

export function createListNode(listTag: ListNodeTagType): ListNode {
  return new ListNode(listTag);
}
