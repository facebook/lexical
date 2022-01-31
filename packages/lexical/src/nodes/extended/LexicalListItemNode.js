/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
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
  LexicalNode,
  Selection,
} from 'lexical';
import type {ParagraphNode} from 'lexical/ParagraphNode';

import {$isElementNode, ElementNode} from 'lexical';
import {$createParagraphNode, $isParagraphNode} from 'lexical/ParagraphNode';
import {$createListNode, $isListNode} from 'lexical/ListNode';
import invariant from 'shared/invariant';
import {$getTopListNode, $isLastItemInList} from '@lexical/helpers/nodes';
import {
  addClassNamesToElement,
  removeClassNamesFromElement,
} from '@lexical/helpers/elements';

export class ListItemNode extends ElementNode {
  static getType(): string {
    return 'listitem';
  }

  static clone(node: ListItemNode): ListItemNode {
    return new ListItemNode(node.__key);
  }

  constructor(key?: NodeKey): void {
    super(key);
  }

  // View

  createDOM<EditorContext>(config: EditorConfig<EditorContext>): HTMLElement {
    const element = document.createElement('li');
    element.value = getListItemValue(this);
    $setListItemThemeClassNames(element, config.theme, this);
    return element;
  }

  updateDOM<EditorContext>(
    prevNode: ListItemNode,
    dom: HTMLElement,
    config: EditorConfig<EditorContext>,
  ): boolean {
    //$FlowFixMe - this is always HTMLListItemElement
    dom.value = getListItemValue(this);
    $setListItemThemeClassNames(dom, config.theme, this);
    return false;
  }

  // Mutation

  append(...nodes: LexicalNode[]): ListItemNode {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if ($isElementNode(node) && this.canMergeWith(node)) {
        const children = node.getChildren();
        this.append(...children);
        node.remove();
      } else {
        super.append(node);
      }
    }
    return this;
  }

  replace<N: LexicalNode>(replaceWithNode: N): N {
    if ($isListItemNode(replaceWithNode)) {
      return super.replace(replaceWithNode);
    }
    const list = this.getParentOrThrow();
    if ($isListNode(list)) {
      const childrenKeys = list.__children;
      const childrenLength = childrenKeys.length;
      const index = childrenKeys.indexOf(this.__key);
      if (index === 0) {
        list.insertBefore(replaceWithNode);
      } else if (index === childrenLength - 1) {
        list.insertAfter(replaceWithNode);
      } else {
        // Split the list
        const newList = $createListNode(list.__tag);
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

  insertAfter(node: LexicalNode): LexicalNode {
    const siblings = this.getNextSiblings();
    if ($isListItemNode(node)) {
      // mark subsequent list items dirty so we update their value attribute.
      siblings.forEach((sibling) => sibling.markDirty());
      return super.insertAfter(node);
    }

    const listNode = this.getParentOrThrow();
    if (!$isListNode(listNode)) {
      invariant(
        false,
        'insertAfter: list node is not parent of list item node',
      );
    }

    // Attempt to merge tables if the list is of the same type.
    if ($isListNode(node) && node.getTag() === listNode.getTag()) {
      let child = node;
      const children = node.getChildren();
      for (let i = children.length - 1; i >= 0; i--) {
        child = children[i];
        this.insertAfter(child);
      }
      return child;
    }

    // Otherwise, split the list
    // Split the lists and insert the node in between them
    listNode.insertAfter(node);
    if (siblings.length !== 0) {
      const newListNode = $createListNode(listNode.getTag());
      siblings.forEach((sibling) => newListNode.append(sibling));
      node.insertAfter(newListNode);
    }
    return node;
  }

  insertNewAfter(): ListItemNode | ParagraphNode {
    const nextSibling = this.getNextSibling();
    const prevSibling = this.getPreviousSibling();
    const list = $getTopListNode(this);
    const isLast = $isLastItemInList(this);

    let newElement;

    if (
      $isElementNode(list) &&
      this.getTextContent() === '' &&
      (prevSibling === null || nextSibling === null) &&
      isLast
    ) {
      if (nextSibling === null) {
        newElement = $createParagraphNode();
        list.insertAfter(newElement);
      } else {
        newElement = $createParagraphNode();
        list.insertBefore(newElement);
      }
      // The naive approach would be to remove this list item and then the list, if it's empty.
      // However, nodes may be repeatedly indented, to create deeply nested lists that each
      // contain just one bullet.
      // Our goal is to remove these (now-empty) deeply nested lists. The easiest way to do that
      // is crawl back up the tree until we find a node that has siblings (e.g. is actually part
      // of the list contents) and delete that, or delete the root of the list (if no list nodes
      // have siblings.)
      let emptyListPtr = this;
      while (
        emptyListPtr.getNextSibling() == null &&
        emptyListPtr.getPreviousSibling() == null
      ) {
        const parent = emptyListPtr.getParent();
        if (
          parent == null ||
          !($isListItemNode(emptyListPtr) || $isListNode(emptyListPtr))
        ) {
          break;
        }
        emptyListPtr = parent;
      }
      emptyListPtr.remove();
    } else {
      newElement = $createListItemNode();
      this.insertAfter(newElement);
    }

    return newElement;
  }

  collapseAtStart(selection: Selection): true {
    const paragraph = $createParagraphNode();
    const children = this.getChildren();
    children.forEach((child) => paragraph.append(child));
    const listNode = this.getParentOrThrow();
    const listNodeParent = listNode.getParentOrThrow();
    const isNested = $isListItemNode(listNodeParent);
    if (listNode.getChildrenSize() === 1) {
      if (isNested) {
        // if the list node is nested, we just want to remove it,
        // effectively unindenting it.
        listNode.remove();
        listNodeParent.select();
      } else {
        listNode.replace(paragraph);
        // If we have selection on the list item, we'll need to move it
        // to the paragraph
        const anchor = selection.anchor;
        const focus = selection.focus;
        const key = paragraph.getKey();
        if (anchor.type === 'element' && anchor.getNode().is(this)) {
          anchor.set(key, anchor.offset, 'element');
        }
        if (focus.type === 'element' && focus.getNode().is(this)) {
          focus.set(key, focus.offset, 'element');
        }
      }
    } else {
      listNode.insertBefore(paragraph);
      this.remove();
    }
    return true;
  }

  insertBefore(nodeToInsert: LexicalNode): LexicalNode {
    const siblings = this.getNextSiblings();
    if ($isListItemNode(nodeToInsert)) {
      // mark subsequent list items dirty so we update their value attribute.
      siblings.forEach((sibling) => sibling.markDirty());
    }
    return super.insertBefore(nodeToInsert);
  }

  canInsertAfter(node: LexicalNode): boolean {
    return $isListItemNode(node);
  }

  canReplaceWith(replacement: LexicalNode): boolean {
    return $isListItemNode(replacement);
  }

  canMergeWith(node: LexicalNode): boolean {
    return $isParagraphNode(node) || $isListItemNode(node);
  }
}

function getListItemValue(listItem: ListItemNode): number {
  const list = listItem.getParent();

  let value = 1;
  if (list != null) {
    if (!$isListNode(list)) {
      invariant(
        false,
        'getListItemValue: list node is not parent of list item node',
      );
    } else {
      value = list.__start;
    }
  }

  const siblings = listItem.getPreviousSiblings();
  for (let i = 0; i < siblings.length; i++) {
    const sibling = siblings[i];
    if ($isListItemNode(sibling) && !$isListNode(sibling.getFirstChild())) {
      value++;
    }
  }
  return value;
}

function $setListItemThemeClassNames(
  dom: HTMLElement,
  editorThemeClasses: EditorThemeClasses,
  node: ListItemNode,
): void {
  const classesToAdd = [];
  const classesToRemove = [];
  const listTheme = editorThemeClasses.list;
  const listItemClassName = listTheme ? listTheme.listitem : undefined;
  let nestedListItemClassName;
  if (listTheme && listTheme.nested) {
    nestedListItemClassName = listTheme.nested.listitem;
  }

  if (listItemClassName !== undefined) {
    const listItemClasses = listItemClassName.split(' ');
    classesToAdd.push(...listItemClasses);
  }

  if (nestedListItemClassName !== undefined) {
    const nestedListItemClasses = nestedListItemClassName.split(' ');
    if (node.getChildren().some((child) => $isListNode(child))) {
      classesToAdd.push(...nestedListItemClasses);
    } else {
      classesToRemove.push(...nestedListItemClasses);
    }
  }

  if (classesToAdd.length > 0) {
    addClassNamesToElement(dom, ...classesToAdd);
  }

  if (classesToRemove.length > 0) {
    removeClassNamesFromElement(dom, ...classesToRemove);
  }
}

export function $createListItemNode(): ListItemNode {
  return new ListItemNode();
}

export function $isListItemNode(node: ?LexicalNode): boolean %checks {
  return node instanceof ListItemNode;
}
