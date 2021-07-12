/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  OutlineNode,
  NodeKey,
  ParsedBlockNode,
  EditorThemeClasses,
} from 'outline';

import {BlockNode} from 'outline';

type ListNodeTagType = 'ul' | 'ol';

export type ParsedListNode = {
  ...ParsedBlockNode,
  __tag: ListNodeTagType,
};

export class ListNode extends BlockNode {
  __tag: ListNodeTagType;

  constructor(tag: ListNodeTagType, key?: NodeKey) {
    super(key);
    this.__tag = tag;
    this.__type = 'list';
  }
  clone(): ListNode {
    return new ListNode(this.__tag, this.__key);
  }
  getTag(): ListNodeTagType {
    return this.__tag;
  }

  // View

  createDOM(editorThemeClasses: EditorThemeClasses): HTMLElement {
    const tag = this.__tag;
    const element = document.createElement(tag);
    const classNames = editorThemeClasses.list;
    if (classNames !== undefined) {
      // $FlowFixMe: intentional cast
      const className = classNames[tag];
      if (className !== undefined) {
        element.className = className;
      }
    }
    return element;
  }
  updateDOM(prevNode: ListNode, dom: HTMLElement): boolean {
    return false;
  }
}

export function createListNode(tag: ListNodeTagType): ListNode {
  return new ListNode(tag);
}

export function isListNode(node: ?OutlineNode): boolean %checks {
  return node instanceof ListNode;
}
