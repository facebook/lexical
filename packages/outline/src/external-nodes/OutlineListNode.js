// @flow strict

import type {NodeKey} from '../OutlineNode';

import {BlockNode} from '../OutlineBlockNode';

type ListNodeTagType = 'ul' | 'ol';

export class ListNode extends BlockNode {
  _type: 'list';
  _tag: ListNodeTagType;

  constructor(tag: ListNodeTagType, key?: NodeKey) {
    super(key);
    this._tag = tag;
    this._type = 'list';
  }
  static parse(
    // $FlowFixMe: TODO: refine
    data: Object,
  ): ListNode {
    const header = new ListNode(data._tag);
    header._flags = data._flags;
    return header;
  }
  clone(): ListNode {
    const clone = new ListNode(this._tag, this._key);
    clone._children = [...this._children];
    clone._parent = this._parent;
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
  const list = new ListNode(tag);
  // List nodes align with text direection
  list.makeDirectioned();
  return list;
}
