/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  NodeKey,
  EditorConfig,
  EditorThemeClasses,
  OutlineNode,
} from 'outline';
import type {ParagraphNode} from 'outline/ParagraphNode';

import {isBlockNode, BlockNode} from 'outline';
import {createParagraphNode} from 'outline/ParagraphNode';
import {createListNode, isListNode} from 'outline/ListNode';

export class ListItemNode extends BlockNode {
  static deserialize(data: $FlowFixMe): ListItemNode {
    return new ListItemNode();
  }

  constructor(key?: NodeKey) {
    super(key);
    this.__type = 'listitem';
  }

  clone(): ListItemNode {
    return new ListItemNode(this.__key);
  }

  // View

  createDOM<EditorContext>(config: EditorConfig<EditorContext>): HTMLElement {
    const element = document.createElement('li');
    setListItemThemeClassNames(element, config.theme, this);
    return element;
  }

  updateDOM<EditorContext>(
    prevNode: ListItemNode,
    dom: HTMLElement,
    config: EditorConfig<EditorContext>,
  ): boolean {
    setListItemThemeClassNames(dom, config.theme, prevNode);
    return false;
  }

  // Mutation

  replace<N: OutlineNode>(replaceWithNode: N): N {
    if (isListItemNode(replaceWithNode)) {
      return super.replace(replaceWithNode);
    }
    const list = this.getParentOrThrow();
    if (isListNode(list)) {
      const childrenKeys = list.__children;
      const childrenLength = childrenKeys.length;
      const index = childrenKeys.indexOf(this.__key);
      if (index === 0) {
        list.insertBefore(replaceWithNode);
      } else if (index === childrenLength - 1) {
        list.insertAfter(replaceWithNode);
      } else {
        // Split the list
        const newList = createListNode(list.__tag);
        const children = list.getChildren();
        for (let i = index + 1; i < childrenLength; i++) {
          const child = children[i];
          newList.append(child);
        }
        list.insertAfter(replaceWithNode);
        replaceWithNode.insertAfter(newList);
      }
      this.remove();
      if (childrenLength === 1) {
        list.remove();
      }
    }
    return replaceWithNode;
  }

  insertNewAfter(): ListItemNode | ParagraphNode {
    const nextSibling = this.getNextSibling();
    const prevSibling = this.getPreviousSibling();
    const list = this.getParent();
    let newBlock;

    if (
      isBlockNode(list) &&
      this.getTextContent() === '' &&
      (prevSibling === null || nextSibling === null)
    ) {
      if (nextSibling === null) {
        newBlock = createParagraphNode();
        this.remove();
        list.insertAfter(newBlock);
      } else {
        newBlock = createParagraphNode();
        this.remove();
        list.insertBefore(newBlock);
      }
      if (list.getChildrenSize() === 0) {
        list.remove();
      }
    } else {
      newBlock = createListItemNode();
      this.insertAfter(newBlock);
    }

    return newBlock;
  }
}

function setListItemThemeClassNames(
  dom: HTMLElement,
  editorThemeClasses: EditorThemeClasses,
  node: ListItemNode,
): void {
  const classesToAdd = [];
  const classesToRemove = [];
  const listItemClassName = editorThemeClasses.listitem;
  let nestedListClassName;
  if (editorThemeClasses.nestedList) {
    nestedListClassName = editorThemeClasses.nestedList.listitem;
  }

  if (listItemClassName !== undefined) {
    const listItemClasses = listItemClassName.split(' ');
    classesToAdd.push(...listItemClasses);
  }

  if (nestedListClassName !== undefined) {
    const nestedListClasses = nestedListClassName.split(' ');
    if (node.getChildren().some((child) => isListNode(child))) {
      classesToAdd.push(...nestedListClasses);
    } else {
      classesToRemove.push(...nestedListClasses);
    }
  }

  if (classesToAdd.length > 0) {
    dom.classList.add(...classesToAdd);
  }
  if (classesToRemove.length > 0) {
    dom.classList.remove(...classesToRemove);
  }
}

export function createListItemNode(): ListItemNode {
  return new ListItemNode();
}

export function isListItemNode(node: ?OutlineNode): boolean %checks {
  return node instanceof ListItemNode;
}
