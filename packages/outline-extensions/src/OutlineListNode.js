/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {NodeKey} from 'outline';

import {BlockNode} from 'outline';

type ListNodeTagType = 'ul' | 'ol';

export class ListNode extends BlockNode {
  __type: 'list';
  __tag: ListNodeTagType;

  constructor(tag: ListNodeTagType, key?: NodeKey) {
    super(key);
    this.__tag = tag;
    this.__type = 'list';
  }

  clone(): ListNode {
    const clone = new ListNode(this.__tag, this.__key);
    clone.__children = [...this.__children];
    clone.__parent = this.__parent;
    clone.__flags = this.__flags;
    return clone;
  }
  getTag(): ListNodeTagType {
    return this.__tag;
  }

  // View

  createDOM(): HTMLElement {
    return document.createElement(this.__tag);
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
