/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  LexicalNode,
  NodeKey,
  EditorConfig,
  EditorThemeClasses,
} from 'lexical';

import {$createTextNode, ElementNode} from 'lexical';
import {$createListItemNode, $isListItemNode} from 'lexical/ListItemNode';
import {
  addClassNamesToElement,
  removeClassNamesFromElement,
} from 'lexical/elements';

type ListNodeTagType = 'ul' | 'ol';

export class ListNode extends ElementNode {
  __tag: ListNodeTagType;
  __start: number;

  static getType(): string {
    return 'list';
  }

  static clone(node: ListNode): ListNode {
    return new ListNode(node.__tag, node.__start, node.__key);
  }

  constructor(tag: ListNodeTagType, start: number, key?: NodeKey): void {
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
    if (this.__start !== 1) {
      dom.setAttribute('start', String(this.__start));
    }
    setListThemeClassNames(dom, config.theme, this);
    return dom;
  }

  updateDOM<EditorContext>(
    prevNode: ListNode,
    dom: HTMLElement,
    config: EditorConfig<EditorContext>,
  ): boolean {
    if (prevNode.__tag !== this.__tag) {
      return true;
    }
    setListThemeClassNames(dom, config.theme, this);
    return false;
  }

  canBeEmpty(): false {
    return false;
  }

  append(...nodesToAppend: LexicalNode[]): ListNode {
    for (let i = 0; i < nodesToAppend.length; i++) {
      const currentNode = nodesToAppend[i];
      if ($isListItemNode(currentNode)) {
        super.append(currentNode);
      } else {
        const listItemNode = $createListItemNode();
        if ($isListNode(currentNode)) {
          listItemNode.append(currentNode);
        } else {
          const textNode = $createTextNode(currentNode.getTextContent());
          listItemNode.append(textNode);
        }
        super.append(listItemNode);
      }
    }
    return this;
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
      if ($isListItemNode(node.getParent())) {
        classesToAdd.push(...nestedListItemClasses);
      } else {
        classesToRemove.push(...nestedListItemClasses);
      }
    }
  }

  if (classesToAdd.length > 0) {
    addClassNamesToElement(dom, ...classesToAdd);
  }
  if (classesToRemove.length > 0) {
    removeClassNamesFromElement(dom, ...classesToRemove);
  }
}

export function $createListNode(
  tag: ListNodeTagType,
  start?: number = 1,
): ListNode {
  return new ListNode(tag, start);
}

export function $isListNode(node: ?LexicalNode): boolean %checks {
  return node instanceof ListNode;
}
