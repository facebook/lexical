/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {OutlineNode, NodeKey, EditorConfig} from 'outline';

import {BlockNode} from 'outline';

type ListNodeTagType = 'ul' | 'ol';

export class ListNode extends BlockNode {
  __tag: ListNodeTagType;

  static clone(node: ListNode): ListNode {
    return new ListNode(node.__tag, node.__key);
  }

  constructor(tag: ListNodeTagType, key?: NodeKey) {
    super(key);
    this.__tag = tag;
    this.__type = 'list';
  }

  getTag(): ListNodeTagType {
    return this.__tag;
  }

  // View

  createDOM<EditorContext>(config: EditorConfig<EditorContext>): HTMLElement {
    const tag = this.__tag;
    const element = document.createElement(tag);
    const theme = config.theme;
    const classNames = theme.list;
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
