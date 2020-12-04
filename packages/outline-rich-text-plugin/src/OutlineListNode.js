// @flow strict

import type {NodeKey} from 'outline';

import {BlockNode} from 'outline';

type ListNodeTagType = 'ul' | 'ol';

export class ListNode extends BlockNode {
  _type: 'list';
  _tag: ListNodeTagType;

  constructor(tag: ListNodeTagType, key?: NodeKey) {
    super(key);
    this._tag = tag;
    this.type = 'list';
  }
  static parse(
    // $FlowFixMe: TODO: refine
    data: Object,
  ): ListNode {
    const header = new ListNode(data._tag);
    header.flags = data.flags;
    return header;
  }
  clone(): ListNode {
    const clone = new ListNode(this._tag, this.key);
    clone.children = [...this.children];
    clone.parent = this.parent;
    clone.flags = this.flags;
    return clone;
  }

  // View

  createDOM(): HTMLElement {
    return document.createElement(this._tag);
  }
  updateDOM(prevNode: ListNode, dom: HTMLElement): boolean {
    return false;
  }
}

export function createListNode(tag: ListNodeTagType): ListNode {
  const list = new ListNode(tag);
  // List nodes align with text direection
  list.makeDirectioned();
  return list;
}
