/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 */

import type {
  DOMConversionMap,
  DOMConversionOutput,
  EditorConfig,
  EditorThemeClasses,
  LexicalNode,
  NodeKey,
  ParagraphNode,
  RangeSelection,
} from 'lexical';

import {
  addClassNamesToElement,
  removeClassNamesFromElement,
} from '@lexical/utils';
import {
  $createParagraphNode,
  $isElementNode,
  $isParagraphNode,
  ElementNode,
} from 'lexical';
import invariant from 'shared/invariant';

import {$createListNode, $isListNode} from './';
import {
  $handleIndent,
  $handleOutdent,
  updateChildrenListItemValue,
} from './formatList';

export class ListItemNode extends ElementNode {
  __value: number;

  static getType(): string {
    return 'listitem';
  }

  static clone(node: ListItemNode): ListItemNode {
    return new ListItemNode(node.__value, node.__key);
  }

  constructor(value?: number, key?: NodeKey): void {
    super(key);
    this.__value = value === undefined ? 1 : value;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const element = document.createElement('li');
    const parent = this.getParent();
    if ($isListNode(parent)) {
      updateChildrenListItemValue(parent);
    }
    element.value = this.__value;
    $setListItemThemeClassNames(element, config.theme, this);
    return element;
  }

  updateDOM(
    prevNode: ListItemNode,
    dom: HTMLElement,
    config: EditorConfig,
  ): boolean {
    const parent = this.getParent();
    if ($isListNode(parent)) {
      updateChildrenListItemValue(parent);
    }
    // $FlowFixMe - this is always HTMLListItemElement
    dom.value = this.__value;
    $setListItemThemeClassNames(dom, config.theme, this);
    return false;
  }

  static importDOM(): DOMConversionMap | null {
    return {
      li: (node: Node) => ({
        conversion: convertListItemElement,
        priority: 0,
      }),
    };
  }

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
        const newList = $createListNode(list.getTag());
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
    const listNode = this.getParentOrThrow();
    if (!$isListNode(listNode)) {
      invariant(
        false,
        'insertAfter: list node is not parent of list item node',
      );
    }

    const siblings = this.getNextSiblings();
    if ($isListItemNode(node)) {
      const after = super.insertAfter(node);
      const afterListNode = node.getParentOrThrow();
      if ($isListNode(afterListNode)) {
        updateChildrenListItemValue(afterListNode);
      }
      return after;
    }

    // Attempt to merge if the list is of the same type.
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

  remove(preserveEmptyParent?: boolean): void {
    const nextSibling = this.getNextSibling();
    super.remove(preserveEmptyParent);
    if (nextSibling !== null) {
      const parent = nextSibling.getParent();
      if ($isListNode(parent)) {
        updateChildrenListItemValue(parent);
      }
    }
  }

  insertNewAfter(): ListItemNode | ParagraphNode {
    const newElement = $createListItemNode();
    this.insertAfter(newElement);

    return newElement;
  }

  collapseAtStart(selection: RangeSelection): true {
    const paragraph = $createParagraphNode();
    const children = this.getChildren();
    children.forEach((child) => paragraph.append(child));
    const listNode = this.getParentOrThrow();
    const listNodeParent = listNode.getParentOrThrow();
    const isIndented = $isListItemNode(listNodeParent);
    if (listNode.getChildrenSize() === 1) {
      if (isIndented) {
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

  getValue(): number {
    const self = this.getLatest();
    return self.__value;
  }

  setValue(value: number): void {
    const self = this.getWritable();
    self.__value = value;
  }

  getIndent(): number {
    // ListItemNode should always have a ListNode for a parent.
    let listNodeParent = this.getParentOrThrow().getParentOrThrow();
    let indentLevel = 0;
    while ($isListItemNode(listNodeParent)) {
      listNodeParent = listNodeParent.getParentOrThrow().getParentOrThrow();
      indentLevel++;
    }
    return indentLevel;
  }

  setIndent(indent: number): this {
    let currentIndent = this.getIndent();
    while (currentIndent !== indent) {
      if (currentIndent < indent) {
        $handleIndent([this]);
        currentIndent++;
      } else {
        $handleOutdent([this]);
        currentIndent--;
      }
    }
    return this;
  }

  canIndent(): false {
    // Indent/outdent is handled specifically in the RichText logic.
    return false;
  }

  insertBefore(nodeToInsert: LexicalNode): LexicalNode {
    if ($isListItemNode(nodeToInsert)) {
      const parent = this.getParentOrThrow();
      if ($isListNode(parent)) {
        // mark subsequent list items dirty so we update their value attribute.
        updateChildrenListItemValue(parent);
      }
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

function convertListItemElement(domNode: Node): DOMConversionOutput {
  return {node: $createListItemNode()};
}

export function $createListItemNode(): ListItemNode {
  return new ListItemNode();
}

export function $isListItemNode(node: ?LexicalNode): boolean %checks {
  return node instanceof ListItemNode;
}
