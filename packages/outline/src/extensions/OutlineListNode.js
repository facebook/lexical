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
  EditorConfig,
  EditorThemeClasses,
} from 'outline';

import {BlockNode} from 'outline';
import {isListItemNode} from 'outline/ListItemNode';

type ListNodeTagType = 'ul' | 'ol';

export class ListNode extends BlockNode {
  __tag: ListNodeTagType;
  __start: number;

  static getType(): string {
    return 'list';
  }

  static clone(node: ListNode): ListNode {
    return new ListNode(node.__tag, node.__start, node.__key);
  }

  constructor(tag: ListNodeTagType, start: number, key?: NodeKey) {
    super(key);
    this.__tag = tag;
    this.__start = start;
  }

  getTag(): ListNodeTagType {
    return this.__tag;
  }

  // View

  createDOM<EditorContext>(config: EditorConfig<EditorContext>): HTMLElement {
    const tag = this.__tag;
    const dom = document.createElement(tag);
    setListThemeClassNames(dom, config.theme, this);
    return dom;
  }

  updateDOM<EditorContext>(
    prevNode: ListNode,
    dom: HTMLElement,
    config: EditorConfig<EditorContext>,
  ): boolean {
    setListThemeClassNames(dom, config.theme, this);
    return false;
  }

  canBeEmpty(): false {
    return false;
  }
}

function setListThemeClassNames(
  dom: HTMLElement,
  editorThemeClasses: EditorThemeClasses,
  node: ListNode,
): void {
  const classesToAdd = [];
  const classesToRemove = [];
  const listTheme = editorThemeClasses.list;

  if (listTheme !== undefined) {
    const listClassName = listTheme[node.__tag];
    let nestedListClassName;
    if (editorThemeClasses.nestedList) {
      nestedListClassName = editorThemeClasses.nestedList.list;
    }

    if (listClassName !== undefined) {
      const listItemClasses = listClassName.split(' ');
      classesToAdd.push(...listItemClasses);
    }

    if (nestedListClassName !== undefined) {
      const nestedListItemClasses = nestedListClassName.split(' ');
      if (isListItemNode(node.getParent())) {
        classesToAdd.push(...nestedListItemClasses);
      } else {
        classesToRemove.push(...nestedListItemClasses);
      }
    }
  }

  if (classesToAdd.length > 0) {
    dom.classList.add(...classesToAdd);
  }
  if (classesToRemove.length > 0) {
    dom.classList.remove(...classesToRemove);
  }
}

export function createListNode(
  tag: ListNodeTagType,
  start?: number = 1,
): ListNode {
  return new ListNode(tag, start);
}

export function isListNode(node: ?OutlineNode): boolean %checks {
  return node instanceof ListNode;
}
