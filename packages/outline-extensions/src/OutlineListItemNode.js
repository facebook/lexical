/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {NodeKey, EditorThemeClasses, OutlineNode} from 'outline';
import type {ParagraphNode} from 'outline-extensions/ParagraphNode';

import {BlockNode} from 'outline';
import {createParagraphNode} from 'outline-extensions/ParagraphNode';
import {createListNode, ListNode} from 'outline-extensions/ListNode';

export class ListItemNode extends BlockNode {
  constructor(key?: NodeKey) {
    super(key);
    this.__type = 'listitem';
  }

  clone(): ListItemNode {
    const clone = new ListItemNode(this.__key);
    clone.__children = [...this.__children];
    clone.__parent = this.__parent;
    clone.__flags = this.__flags;
    return clone;
  }

  childrenNeedDirection(): false {
    return false;
  }

  // View

  createDOM(editorThemeClasses: EditorThemeClasses): HTMLElement {
    const element = document.createElement('li');
    const className = editorThemeClasses.listitem;
    if (className !== undefined) {
      element.className = className;
    }
    return element;
  }
  updateDOM(prevNode: ListItemNode, dom: HTMLElement): boolean {
    return false;
  }

  // Mutation

  replace<N: OutlineNode>(replaceWithNode: N): N {
    if (replaceWithNode instanceof ListItemNode) {
      return super.replace(replaceWithNode);
    }
    const list = this.getParentOrThrow();
    if (list instanceof ListNode) {
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

  mergeWithPreviousSibling(): void {
    const prevBlock = this.getPreviousSibling();
    if (prevBlock !== null) {
      super.mergeWithPreviousSibling();
      return;
    }
    const listNode = this.getParentOrThrow();
    const paragraph = createParagraphNode();
    const children = this.getChildren();
    children.forEach((child) => paragraph.append(child));

    if (listNode.getChildren().length === 1) {
      listNode.replace(paragraph);
    } else {
      listNode.insertBefore(paragraph);
      this.remove();
    }
  }

  mergeWithNextSibling(): void {
    const nextBlock = this.getNextSibling();
    if (nextBlock !== null) {
      super.mergeWithNextSibling();
      return;
    }
  }

  insertNewAfter(): ListItemNode | ParagraphNode {
    const nextSibling = this.getNextSibling();
    const prevSibling = this.getPreviousSibling();
    const list = this.getParent();
    let newBlock;

    if (
      list instanceof BlockNode &&
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
      if (list.getChildren().length === 0) {
        list.remove();
      }
    } else {
      newBlock = createListItemNode();
      this.insertAfter(newBlock);
    }

    return newBlock;
  }
}

export function createListItemNode(): ListItemNode {
  return new ListItemNode();
}
